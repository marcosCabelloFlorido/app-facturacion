import ExcelJS from 'exceljs';
import { assert } from './db.ts';
import { checkXlsxArchive, readCsv } from './import-reader.ts';

export async function previewFileTable(
  file: { filename: string; data: Buffer },
  options: { page: number; sheet: number; delimiter: 'auto' | ';' | ',' | '\t'; encoding: string },
) {
  let rows: string[][] = [],
    sheets: string[] = [],
    rowCount = 0,
    columnCount = 0;
  const pageSize = 50;
  const offset = (options.page - 1) * pageSize;
  if (file.filename.toLowerCase().endsWith('.xlsx')) {
    checkXlsxArchive(file.data);
    const book = new ExcelJS.Workbook();
    await book.xlsx.load(file.data as any);
    sheets = book.worksheets.map((sheet) => sheet.name);
    const sheet = book.worksheets[options.sheet];
    assert(sheet, 'Hoja no encontrada.', 404);
    rowCount = sheet.rowCount;
    columnCount = sheet.columnCount;
    assert(
      rowCount <= 10001 && columnCount <= 100,
      'La vista previa admite hasta 10.000 filas y 100 columnas.',
      400,
    );
    for (let n = offset + 1; n <= Math.min(rowCount, offset + pageSize); n++) {
      const row: string[] = [];
      for (let c = 1; c <= columnCount; c++) {
        const cell = sheet.getCell(n, c);
        row.push(
          cell.value instanceof Date
            ? cell.value.toISOString().slice(0, 10)
            : cell.formula && cell.result === undefined
              ? '=' + cell.formula
              : cell.text,
        );
      }
      rows.push(row);
    }
  } else {
    assert(file.filename.toLowerCase().endsWith('.csv'), 'Este archivo no es una tabla.', 400);
    let text: string;
    try {
      text = new TextDecoder(options.encoding, { fatal: true }).decode(file.data);
    } catch {
      assert(false, 'Selecciona otra codificación para leer este CSV.', 400);
    }
    if (options.delimiter === 'auto') {
      const candidates: string[][][] = [];
      for (const delimiter of [';', ',', '\t']) {
        try {
          candidates.push(readCsv(text!, delimiter));
        } catch {
          /* Try the next supported separator. */
        }
      }
      assert(candidates.length > 0, 'No se pudo leer el CSV. Selecciona su separador.', 400);
      rows = candidates.sort((a, b) => (b[0]?.length || 0) - (a[0]?.length || 0))[0];
    } else rows = readCsv(text!, options.delimiter);
    rowCount = rows.length;
    columnCount = Math.max(0, ...rows.map((row) => row.length));
    rows = rows.slice(offset, offset + pageSize);
  }
  return { rows, sheets, rowCount, columnCount, page: options.page, pageSize };
}
