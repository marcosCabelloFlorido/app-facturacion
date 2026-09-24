import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { Decimal } from 'decimal.js';
import type { ContactStatement } from './contact-statement.ts';

const date = (value: string) => value.slice(0, 10).split('-').reverse().join('/');
const money = (value: string) => {
  const [whole, fraction] = new Decimal(value).toFixed(2).split('.');
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + fraction + ' €';
};
const balanceRows = (r: ContactStatement): [string, string][] => [
  ['Por cobrar', r.balances.receivable],
  ['De ello, vencido por cobrar', r.balances.overdue_receivable],
  ['Por pagar', r.balances.payable],
  ['De ello, vencido por pagar', r.balances.overdue_payable],
];
const balanceNote =
  'Saldos actuales de todas las fechas, con cobros, pagos, abonos y anticipos aplicados. No son el saldo al cierre del periodo.';
const periodNote =
  'Documentos por su fecha; movimientos por su fecha. No incluye borradores ni presupuestos.';
export async function statementPdf(r: ContactStatement) {
  const pdf = new PDFDocument({
    size: 'A4',
    margin: 44,
    bufferPages: true,
    info: { Title: `Extracto de ${r.contact.name}`, Author: r.company.name },
  });
  const chunks: Buffer[] = [];
  const done = new Promise<Buffer>((resolve, reject) => {
    pdf.on('data', (chunk) => chunks.push(chunk));
    pdf.on('end', () => resolve(Buffer.concat(chunks)));
    pdf.on('error', reject);
  });
  const paragraph = (value: string, size = 10, bold = false) => {
    pdf
      .font(bold ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(size)
      .fillColor('#171717')
      .text(value, 44, pdf.y, { width: 507, lineGap: 3 });
    pdf.moveDown(0.5);
  };
  paragraph(r.company.name, 11, true);
  paragraph(r.company.taxId, 9);
  paragraph('Extracto de actividad', 22, true);
  paragraph(r.contact.name, 13, true);
  paragraph(`NIF: ${r.contact.taxId}   |   ${date(r.from)} - ${date(r.to)}`, 10);
  paragraph(
    `Generado: ${new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Madrid' }).format(new Date(r.generated))}`,
    9,
  );
  paragraph('Pendiente actual · todas las fechas', 12, true);
  for (const [label, value] of balanceRows(r)) paragraph(`${label}: ${money(value)}`, 10);
  paragraph(balanceNote, 9);
  paragraph(periodNote, 9);
  const wrap = (value: string, width: number): string[] => {
    const lines: string[] = [];
    for (const source of (value || '-').split('\n')) {
      let line = '';
      for (const char of source) {
        if (line && pdf.widthOfString(line + char) > width) {
          lines.push(line);
          line = '';
        }
        line += char;
      }
      lines.push(line);
    }
    return lines;
  };
  const table = (
    title: string,
    headers: string[],
    widths: number[],
    rows: string[][],
    numeric: number[],
  ) => {
    let y = pdf.y + 14;
    const header = () => {
      pdf
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor('#171717')
        .text(title, 44, y, { width: 507 });
      y = pdf.y + 12;
      pdf.rect(44, y, 507, 32).fill('#ededed');
      let x = 44;
      headers.forEach((text, i) => {
        pdf
          .font('Helvetica-Bold')
          .fontSize(8)
          .fillColor('#171717')
          .text(text, x + 5, y + 5, {
            width: widths[i] - 10,
            align: numeric.includes(i) ? 'right' : 'left',
          });
        x += widths[i];
      });
      y += 38;
    };
    if (y > 650) {
      pdf.addPage();
      y = 44;
    }
    header();
    if (!rows.length) {
      pdf
        .font('Helvetica')
        .fontSize(9)
        .text('Sin movimientos en este periodo.', 49, y, { width: 497 });
      pdf.y = y + 28;
      return;
    }
    for (const row of rows) {
      pdf.font('Helvetica').fontSize(8.5);
      const cells = row.map((value, i) => wrap(value, widths[i] - 10));
      let offset = 0;
      const count = Math.max(...cells.map((c) => c.length));
      while (offset < count) {
        let available = Math.floor((748 - y - 12) / 12);
        if (available < 2 || (offset === 0 && count <= 45 && count > available)) {
          pdf.addPage();
          y = 44;
          header();
          available = Math.floor((748 - y - 12) / 12);
        }
        const take = Math.min(available, count - offset);
        let x = 44;
        cells.forEach((lines, i) => {
          pdf.font('Helvetica').fontSize(8.5).fillColor('#171717');
          lines.slice(offset, offset + take).forEach((line, j) =>
            pdf.text(line, x + 5, y + j * 12, {
              width: widths[i] - 10,
              lineBreak: false,
              align: numeric.includes(i) ? 'right' : 'left',
            }),
          );
          x += widths[i];
        });
        y += take * 12 + 12;
        offset += take;
      }
    }
    pdf.y = y;
  };
  table(
    'Documentos del periodo',
    ['Fecha', 'Documento', 'Tipo', 'Dirección', 'Total', 'Pendiente actual'],
    [62, 94, 101, 70, 90, 90],
    r.documents.map((d) => [
      date(d.date),
      d.number,
      d.type,
      d.direction,
      money(d.total),
      money(d.balance),
    ]),
    [4, 5],
  );
  table(
    'Movimientos del periodo',
    ['Fecha', 'Movimiento', 'Documento', 'Referencia', 'Efecto en caja', 'Importe'],
    [62, 97, 83, 97, 83, 85],
    r.movements.map((m) => [
      date(m.date),
      m.type,
      m.document,
      m.reference,
      m.effect,
      money(m.amount),
    ]),
    [5],
  );
  const pages = pdf.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    pdf.switchToPage(i);
    pdf
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#666666')
      .text(`${r.contact.taxId}  ·  ${date(r.from)} - ${date(r.to)}`, 44, 782, {
        width: 380,
        lineBreak: false,
      });
    pdf.text(`${i + 1} / ${pages.count}`, 470, 782, {
      width: 81,
      align: 'right',
      lineBreak: false,
    });
  }
  pdf.end();
  return done;
}

// Runtime export uses the application's existing ExcelJS dependency and works in Docker.
export async function statementWorkbook(r: ContactStatement) {
  const book = new ExcelJS.Workbook();
  book.creator = r.company.name;
  book.created = new Date(r.generated);
  const amount = (value: string): string | number => {
    // Excel keeps only 15 significant digits: retain larger amounts as exact text.
    const exact = new Decimal(value).toFixed(2);
    return exact.replace(/[^0-9]/g, '').replace(/^0+/, '').length > 15 ? exact : Number(exact);
  };
  const format = '#,##0.00 "€";[Red]-#,##0.00 "€";0.00 "€"';
  const summary = book.addWorksheet('Resumen', { views: [{ showGridLines: false }] });
  summary.columns = [{ width: 46 }, { width: 46 }];
  summary.addRow(['Extracto de actividad']);
  summary.addRow([r.company.name, r.company.taxId]);
  summary.addRow([r.contact.name, r.contact.taxId]);
  for (const index of [2, 3]) {
    const row = summary.getRow(index);
    row.alignment = { wrapText: true, vertical: 'top' };
    row.height = 15 * Math.max(1, Math.ceil(String(row.getCell(1).value).length / 44));
  }
  summary.addRow(['Desde', date(r.from)]);
  summary.addRow(['Hasta', date(r.to)]);
  summary.addRow(['Generado (UTC)', r.generated]);
  summary.addRow([]);
  summary.addRow(['Pendiente actual · todas las fechas', 'Importe (EUR)']);
  for (const [label, value] of balanceRows(r)) {
    const row = summary.addRow([label, amount(value)]);
    row.getCell(2).numFmt = format;
  }
  for (const note of [
    balanceNote,
    periodNote,
    'Los importes que superan la precisión de Excel se conservan como texto exacto.',
  ]) {
    const row = summary.addRow([note]);
    summary.mergeCells(row.number, 1, row.number, 2);
    row.height = 42;
    row.alignment = { wrapText: true, vertical: 'middle' };
  }
  const sheet = (
    name: string,
    headers: string[],
    widths: number[],
    rows: (string | number | Date)[][],
    numeric: number[],
  ) => {
    const s = book.addWorksheet(name, {
      views: [{ state: 'frozen', ySplit: 1, showGridLines: false }],
    });
    s.columns = widths.map((width) => ({ width }));
    s.addRow(headers);
    for (const data of rows) {
      const row = s.addRow(data.map((value) => (value === '' ? null : value)));
      row.alignment = { vertical: 'top', wrapText: true };
      row.getCell(1).numFmt = 'dd/mm/yyyy';
      for (const index of numeric) {
        row.getCell(index).numFmt = format;
        row.getCell(index).alignment = { horizontal: 'right', vertical: 'top' };
      }
    }
    s.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: Math.max(1, s.rowCount), column: headers.length },
    };
    s.pageSetup = {
      paperSize: 9,
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      printTitlesRow: '1:1',
    };
    return s;
  };
  sheet(
    'Documentos',
    ['Fecha', 'Documento', 'Tipo', 'Dirección', 'Total (EUR)', 'Pendiente actual (EUR)'],
    [14, 26, 24, 18, 24, 26],
    r.documents.map((d) => [
      new Date(d.date + 'T00:00:00Z'),
      d.number,
      d.type,
      d.direction,
      amount(d.total),
      amount(d.balance),
    ]),
    [5, 6],
  );
  sheet(
    'Movimientos',
    ['Fecha', 'Movimiento', 'Documento', 'Referencia', 'Efecto en caja', 'Importe (EUR)'],
    [14, 26, 26, 44, 26, 24],
    r.movements.map((m) => [
      new Date(m.date + 'T00:00:00Z'),
      m.type,
      m.document,
      m.reference,
      m.effect,
      amount(m.amount),
    ]),
    [6],
  );
  for (const s of book.worksheets) {
    s.eachRow((row) =>
      row.eachCell((cell) => {
        cell.font = { name: 'Calibri', size: 11 };
      }),
    );
    for (const index of s === summary ? [1, 8] : [1]) {
      const row = s.getRow(index);
      row.height = 30;
      row.eachCell((cell) => {
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF202020' } };
        cell.alignment = { vertical: 'middle', wrapText: true };
      });
    }
  }
  return Buffer.from(await book.xlsx.writeBuffer());
}
