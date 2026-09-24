import ExcelJS from 'exceljs';
import {inflateRawSync} from 'node:zlib';
import { assert } from './db.ts';
export function readCsv(text: string, delimiter = ';'): string[][] {
  assert([';', ',', '\t'].includes(delimiter), 'Separador no válido.', 400);
  const rows: string[][] = [];
  let row: string[] = [],
    cell = '',
    quoted = false,
    closed = false;
  text = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else cell += ch;
    } else if (ch === '"' && !cell && !closed) quoted = true;
    else if (ch === delimiter) {
      row.push(cell);
      cell = '';
      closed = false;
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
      cell = '';
      closed = false;
    } else {
      assert(!closed || ch === ' ', 'Hay caracteres tras el cierre de una celda CSV.', 400);
      if (!closed) cell += ch;
    }
    assert(
      rows.length <= 10000 && row.length <= 100 && cell.length <= 10000,
      'El archivo supera 10.000 filas, 100 columnas o el tamaño de celda permitido.',
      400,
    );
  }
  assert(!quoted, 'Hay comillas sin cerrar en el CSV.', 400);
  row.push(cell);
  if (row.some((v) => v.trim())) rows.push(row);
  return rows;
}
export function checkXlsxArchive(buffer: Buffer) {
  let end = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i--)
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      end = i;
      break;
    }
  assert(end >= 0, 'El archivo Excel no es un ZIP válido.', 400);
  const count = buffer.readUInt16LE(end + 10);
  let at = buffer.readUInt32LE(end + 16),
    expanded = 0;
  assert(count <= 2000, 'El Excel contiene demasiados elementos.', 400);
  let workbook = false;
  let actualExpanded=0;
  for (let i = 0; i < count; i++) {
    assert(
      at + 46 <= buffer.length && buffer.readUInt32LE(at) === 0x02014b50,
      'Estructura Excel no válida.',
      400,
    );
    const size = buffer.readUInt32LE(at + 24),
      nameSize = buffer.readUInt16LE(at + 28),
      extra = buffer.readUInt16LE(at + 30),
      comment = buffer.readUInt16LE(at + 32);
    expanded += size;
    assert(
      size !== 0xffffffff && expanded <= 25 * 1024 * 1024,
      'El Excel descomprimido supera 25 MB.',
      400,
    );
    assert(at + 46 + nameSize + extra + comment <= buffer.length, 'Archivo Excel truncado.', 400);
    const name = buffer.subarray(at + 46, at + 46 + nameSize).toString('utf8');
    const compressed=buffer.readUInt32LE(at+20),local=buffer.readUInt32LE(at+42),method=buffer.readUInt16LE(at+10);
    assert(!(buffer.readUInt16LE(at+8)&1)&&[0,8].includes(method),'El libro utiliza cifrado o compresión no admitida.',400);
    assert(local+30<=buffer.length&&buffer.readUInt32LE(local)===0x04034b50,'Entrada Excel no válida.',400);
    const start=local+30+buffer.readUInt16LE(local+26)+buffer.readUInt16LE(local+28);
    assert(start+compressed<=buffer.length,'Entrada Excel truncada.',400);
    const packed=buffer.subarray(start,start+compressed);let expandedEntry:Buffer;
    try{expandedEntry=method===0?packed:inflateRawSync(packed,{maxOutputLength:25*1024*1024-actualExpanded+1});}catch{assert(false,'El Excel excede el límite descomprimido o contiene una entrada dañada.',400);}
    actualExpanded+=expandedEntry!.length;
    assert(expandedEntry!.length===size&&actualExpanded<=25*1024*1024,'Tamaño descomprimido Excel no válido.',400);
    if (name === 'xl/workbook.xml') workbook = true;
    assert(!/vbaProject\.bin$/i.test(name), 'No se admiten libros con macros.', 400);
    at += 46 + nameSize + extra + comment;
  }
  assert(workbook, 'Se requiere un libro .xlsx.', 400);
}
export async function readTable(
  file: { filename: string; data: Buffer },
  delimiter = ';',
  encoding = 'utf-8',
) {
  let rows: string[][];
  if (file.filename.toLowerCase().endsWith('.xlsx')) {
    checkXlsxArchive(file.data);
    const book = new ExcelJS.Workbook();
    await book.xlsx.load(file.data as any);
    assert(
      book.worksheets.length === 1,
      'Importa un libro con una sola hoja para evitar omisiones.',
      400,
    );
    const sheet = book.worksheets[0];
    assert(
      sheet.rowCount <= 10001 && sheet.columnCount <= 100,
      'El libro supera 10.000 filas o 100 columnas.',
      400,
    );
    rows = [];
    sheet.eachRow((row) => {
      const values: string[] = [];
      for (let col = 1; col <= sheet.columnCount; col++) {
        const cell = row.getCell(col);
        assert(
          !cell.formula,
          `La celda ${cell.address} contiene una fórmula. Exporta sus valores antes de importar.`,
          400,
        );
        values.push(cell.value instanceof Date ? cell.value.toISOString().slice(0, 10) : cell.text);
      }
      rows.push(values);
    });
  } else {
    assert(file.filename.toLowerCase().endsWith('.csv'), 'Utiliza un archivo CSV o XLSX.', 400);
    assert(['utf-8', 'windows-1252'].includes(encoding), 'Codificación no admitida.', 400);
    let text: string;
    try {
      text = new TextDecoder(encoding, { fatal: true }).decode(file.data);
    } catch {
      assert(false, 'El CSV no corresponde a la codificación seleccionada.', 400);
    }
    rows = readCsv(text!, delimiter);
  }
  assert(rows.length >= 2, 'El archivo debe contener cabeceras y al menos una fila.', 400);
  const headers = rows[0].map((v, i) => v.trim() || `Columna ${i + 1}`);
  assert(
    new Set(headers).size === headers.length,
    'Las cabeceras deben tener nombres distintos.',
    400,
  );
  return { headers, rows: rows.slice(1) };
}
