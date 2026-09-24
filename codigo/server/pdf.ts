import PDFDocument from 'pdfkit';
import { Decimal } from 'decimal.js';
import type { Company, FinancialDocument } from '../shared/domain.ts';
import { labels } from '../shared/domain.ts';
import { defaultTemplate, type TemplateSettings } from '../shared/templates.ts';

export async function documentPdf(
  doc: FinancialDocument,
  company: Company,
  settings: TemplateSettings = defaultTemplate,
  logo?: Buffer,
) {
  const en = settings.language === 'en';
  const locale = en ? 'en-IE' : 'es-ES';
  const w = en
    ? {
        invoice: 'Invoice',
        quote: 'Quotation',
        purchase: 'Purchase invoice',
        credit: 'Credit note',
        draft: 'DRAFT',
        issuer: 'ISSUER',
        customer: 'CUSTOMER',
        supplier: 'SUPPLIER',
        recipient: 'RECIPIENT',
        number: 'DOCUMENT NO.',
        date: 'ISSUE DATE',
        due: 'DUE DATE',
        valid: 'VALID UNTIL',
        operation: 'Supply date',
        registration: 'Posting date',
        reference: 'Reference',
        concept: 'DESCRIPTION',
        quantity: 'QTY.',
        price: 'PRICE',
        tax: 'VAT',
        amount: 'AMOUNT',
        discount: 'Discount',
        net: 'Net amount',
        retention: 'Withholding',
        total: 'TOTAL',
        creditOf: 'Credit for',
        order: 'Purchase order',
        cost: 'Cost centre',
        contract: 'Contract',
      }
    : {
        invoice: labels.invoice,
        quote: labels.quote,
        purchase: labels.purchase,
        credit: labels.credit,
        draft: 'BORRADOR',
        issuer: 'EMISOR',
        customer: 'CLIENTE',
        supplier: 'PROVEEDOR',
        recipient: 'DESTINATARIO',
        number: 'N.º DE DOCUMENTO',
        date: 'FECHA DE EMISIÓN',
        due: 'VENCIMIENTO',
        valid: 'VÁLIDO HASTA',
        operation: 'Operación',
        registration: 'Registro',
        reference: 'Referencia',
        concept: 'CONCEPTO',
        quantity: 'CANT.',
        price: 'PRECIO',
        tax: 'IVA',
        amount: 'IMPORTE',
        discount: 'Descuento',
        net: 'Base imponible',
        retention: 'Retención',
        total: 'TOTAL',
        creditOf: 'Rectificación de',
        order: 'Pedido',
        cost: 'Centro de coste',
        contract: 'Contrato',
      };
  const amount = (v: string, precision = 2) =>
    new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: precision,
    }).format(Number(v));
  const number = (v: string) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: 4 }).format(Number(v));
  const date = (v: string) =>
    new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(v + 'T12:00:00Z'));
  const left = 52,
    right = 543,
    width = right - left,
    bottom = 754;
  const pdf = new PDFDocument({
    size: 'A4',
    margins: { top: 52, left, right: 52, bottom: 52 },
    bufferPages: true,
    info: { Title: `${w[doc.kind]} ${doc.number || w.draft}`, Author: company.name },
  });
  const chunks: Buffer[] = [];
  const done = new Promise<Buffer>((resolve, reject) => {
    pdf.on('data', (chunk) => chunks.push(chunk));
    pdf.on('end', () => resolve(Buffer.concat(chunks)));
    pdf.on('error', reject);
  });
  const font = (size: number, bold = false) =>
    pdf.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size);
  const text = (
    value: string,
    x: number,
    y: number,
    size = 10,
    span = width,
    bold = false,
    align: 'left' | 'right' | 'center' = 'left',
    muted = false,
  ) => {
    font(size, bold)
      .fillColor(muted ? '#626262' : bold ? settings.accent : '#171717')
      .text(value, x, y, { width: span, align, lineGap: 3 });
    return pdf.y;
  };
  const rule = (y: number, x = left, end = right) =>
    pdf.moveTo(x, y).lineTo(end, y).lineWidth(0.5).strokeColor('#dedede').stroke();
  const compactText = (
    value: string,
    x: number,
    y: number,
    span: number,
    size = 10,
    bold = false,
  ) => {
    font(size, bold);
    while (pdf.widthOfString(value) > span && size > 6) font((size -= 0.25), bold);
    return text(value, x, y, size, span, bold, 'right');
  };
  text(w[doc.kind].toUpperCase(), left, 53, 19, width, true, 'center');
  if (doc.status === 'draft') text(w.draft, left, 82, 8, width, false, 'center', true);
  const purchase = doc.kind === 'purchase' || doc.credit_side === 'purchase';
  const issuer = purchase ? doc.party : company,
    recipient = purchase ? company : doc.party;
  let partyY = 126;
  if (logo && !purchase) {
    pdf.image(logo, left, 112, { fit: [125, 42] });
    partyY = 169;
  }
  const party = (value: typeof doc.party, x: number, label: string) => {
    text(label, x, partyY, 8, 222, true, 'left', true);
    const nameEnd = text(value.name, x, partyY + 19, 12, 222, true);
    return text(
      [value.taxId, value.address, value.email].filter(Boolean).join('\n'),
      x,
      nameEnd + 7,
      9,
      222,
    );
  };
  const issuerBottom = party(issuer, left, purchase ? w.supplier : w.issuer);
  const recipientBottom = party(recipient, 321, purchase ? w.recipient : w.customer);
  let y = Math.max(issuerBottom, recipientBottom) + 34;
  const meta = [
    [
      doc.kind === 'invoice' ? (en ? 'INVOICE NO.' : 'N.º DE FACTURA') : w.number,
      doc.number || w.draft,
    ],
    [w.date, date(doc.date)],
    [doc.kind === 'quote' ? w.valid : w.due, date(doc.due_date)],
  ];
  let metaBottom = y;
  meta.forEach(([label, value], i) => {
    const x = left + i * 173;
    text(label, x, y, 8, 145, true, 'left', true);
    metaBottom = Math.max(metaBottom, text(value, x, y + 19, 10, 145));
  });
  y = metaBottom + 12;
  for (const value of [
    doc.operation_date && doc.operation_date !== doc.date
      ? `${w.operation}: ${date(doc.operation_date)}`
      : '',
    doc.registration_date && doc.registration_date !== doc.date
      ? `${w.registration}: ${date(doc.registration_date)}`
      : '',
    doc.reference ? `${w.reference}: ${doc.reference}` : '',
  ].filter(Boolean))
    y = text(value, left, y, 9) + 4;
  y += 24;
  const newPage = () => {
    pdf.addPage();
    text(`${w[doc.kind]} · ${doc.number || w.draft}`, left, 44, 9, width, false, 'left', true);
    y = 82;
  };
  const header = () => {
    text(w.concept, left, y, 8, 210, true);
    text(w.quantity, 273, y, 8, 48, true, 'right');
    text(w.price, 330, y, 8, 88, true, 'right');
    text(w.tax, 426, y, 8, 30, true, 'right');
    text(w.amount, 464, y, 8, 79, true, 'right');
    rule(y + 20);
    y += 34;
  };
  if (y > bottom - 100) newPage();
  header();
  for (const line of doc.lines) {
    const description = [
      line.description,
      Number(line.discount) ? `${w.discount}: ${number(line.discount)} %` : '',
      line.exemptionReason,
    ]
      .filter(Boolean)
      .join('\n');
    font(10);
    const height = Math.max(
      38,
      pdf.heightOfString(description, { width: 210, lineGap: 3 }) +
        (settings.density === 'compact' ? 16 : 24),
    );
    if (y + height > bottom) {
      newPage();
      header();
    }
    text(description, left, y, 10, 210);
    compactText(number(line.quantity), 273, y, 48);
    compactText(amount(line.unitPrice, 4), 330, y, 88);
    compactText(`${line.taxRate}%`, 426, y, 30, 9);
    compactText(amount(line.net), 464, y, 79);
    y += height;
    rule(y - 12);
  }
  const taxes = new Map<string, Decimal>();
  for (const line of doc.lines)
    taxes.set(line.taxRate, (taxes.get(line.taxRate) || new Decimal(0)).plus(line.tax));
  const totals = [
    [w.net, amount(doc.net)],
    ...Array.from(taxes, ([rate, value]) => [`${w.tax} ${rate} %`, amount(value.toFixed(2))]),
  ];
  if (Number(doc.retention))
    totals.push([`${w.retention} ${doc.retention_rate} %`, '-' + amount(doc.retention)]);
  const totalHeight = totals.length * 25 + 66;
  if (y + totalHeight + 24 > bottom) newPage();
  y += 24;
  for (const [label, value] of totals) {
    text(label, 316, y, 9, 124, false, 'left', true);
    compactText(value, 441, y, 102);
    y += 25;
  }
  rule(y - 3, 316);
  text(w.total, 316, y + 13, 10, 83, true);
  compactText(`${doc.kind === 'credit' ? '-' : ''}${amount(doc.total)}`, 400, y + 9, 143, 19, true);
  y += 62;
  const details = [
    doc.kind === 'credit' ? `${w.creditOf} ${doc.reference}. ${doc.notes}` : doc.notes,
    doc.buyer_fields?.purchaseOrder ? `${w.order}: ${doc.buyer_fields.purchaseOrder}` : '',
    doc.buyer_fields?.costCenter ? `${w.cost}: ${doc.buyer_fields.costCenter}` : '',
    doc.buyer_fields?.contract ? `${w.contract}: ${doc.buyer_fields.contract}` : '',
    company.paymentTerms,
    company.iban ? `IBAN: ${company.iban}` : '',
    settings.footer,
  ].filter(Boolean);
  // Stream wrapped lines explicitly so long notes stay within the page margins.
  for (const detail of details) {
    font(9);
    const height = pdf.heightOfString(detail, { width, lineGap: 3 });
    if (height < bottom - 82 && y + height > bottom) newPage();
    for (const paragraph of detail.split('\n')) {
      let row = '';
      for (const word of paragraph.split(/\s+/)) {
        if (font(9).widthOfString(row ? row + ' ' + word : word) > width && row) {
          if (y + 14 > bottom) newPage();
          text(row, left, y, 9, width, false, 'left', true);
          y += 14;
          row = '';
        }
        row += (row ? ' ' : '') + word;
      }
      const rowHeight = font(9).heightOfString(row, { width, lineGap: 3 });
      if (y + rowHeight > bottom) newPage();
      y = text(row || ' ', left, y, 9, width, false, 'left', true) + 3;
    }
    y += 8;
  }
  pdf.end();
  return done;
}
