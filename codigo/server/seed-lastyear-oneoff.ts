import { pool, transaction } from './db.ts';
import { saveDocument, issueDocument, addPayment } from './services.ts';
import type { DocumentInput } from '../shared/domain.ts';

const userId = process.argv[2];
if (!userId) throw new Error('Usage: seed-lastyear-oneoff.ts <userId>');

const customers = [
  {
    name: 'Estudio Norte · DEMO',
    taxId: 'DEMO-NORTE',
    address: 'Calle Ejemplo, 12 · Madrid',
    email: 'norte@example.com',
  },
  {
    name: 'Forma Digital · DEMO',
    taxId: 'DEMO-FORMA',
    address: 'Avenida de Muestra, 8 · Barcelona',
    email: 'forma@example.com',
  },
  {
    name: 'Atelier Sur · DEMO',
    taxId: 'DEMO-SUR',
    address: 'Plaza de Pruebas, 3 · Sevilla',
    email: 'sur@example.com',
  },
];
const descriptions = [
  'Sesión de consultoría y análisis',
  'Diseño de interfaz y experiencia de usuario',
  'Soporte y mantenimiento de la plataforma',
];

await transaction(async (client) => {
  const today = new Date(
    new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' }) + 'T12:00:00Z',
  );
  const base = new Date(Date.UTC(today.getFullYear() - 1, today.getMonth(), 1, 12));
  for (let i = 0; i < 3; i++) {
    const date = new Date(base);
    date.setUTCDate(2 + i * 3);
    const due = new Date(date);
    due.setUTCDate(due.getUTCDate() + 30);
    const input: DocumentInput = {
      kind: 'invoice',
      date: date.toISOString().slice(0, 10),
      dueDate: due.toISOString().slice(0, 10),
      party: customers[i],
      reference: '',
      notes: 'Documento de demostración. Datos ficticios.',
      retentionRate: '0',
      lines: [
        {
          description: descriptions[i],
          quantity: String(2 + i),
          unitPrice: String(310 + i * 75),
          discount: '0',
          taxRate: '21',
          exemptionReason: '',
        },
      ],
    };
    const draft = await saveDocument(client, userId, input);
    const issued = await issueDocument(client, userId, draft.id, draft.version);
    await addPayment(client, userId, {
      documentId: issued.id,
      amount: issued.total,
      date: issued.date,
      method: 'bank',
      reference: '',
    });
  }
  const date = base.toISOString().slice(0, 10);
  const due = new Date(base);
  due.setUTCDate(due.getUTCDate() + 30);
  const draft = await saveDocument(client, userId, {
    kind: 'purchase',
    date,
    dueDate: due.toISOString().slice(0, 10),
    party: {
      name: 'Servicios Cloud · DEMO',
      taxId: 'DEMO-CLOUD',
      address: 'Calle Virtual, 1 · Madrid',
      email: 'cloud@example.com',
    },
    reference: `PROV-DEMO-${date}`,
    notes: 'Compra ficticia',
    retentionRate: '0',
    lines: [
      {
        description: 'Infraestructura y herramientas digitales',
        quantity: '1',
        unitPrice: '220',
        discount: '0',
        taxRate: '21',
        exemptionReason: '',
      },
    ],
  });
  const purchase = await issueDocument(client, userId, draft.id, draft.version);
  await addPayment(client, userId, {
    documentId: purchase.id,
    amount: purchase.total,
    date,
    method: 'bank',
    reference: '',
  });

  const quoteDate = new Date(base);
  quoteDate.setUTCDate(10);
  const quoteDue = new Date(quoteDate);
  quoteDue.setUTCDate(quoteDue.getUTCDate() + 30);
  const quoteDraft = await saveDocument(client, userId, {
    kind: 'quote',
    date: quoteDate.toISOString().slice(0, 10),
    dueDate: quoteDue.toISOString().slice(0, 10),
    party: customers[2],
    reference: 'Presupuesto del año pasado',
    notes: 'Presupuesto de demostración. Datos ficticios.',
    retentionRate: '0',
    lines: [
      {
        description: 'Consultoría estratégica anual',
        quantity: '1',
        unitPrice: '1900',
        discount: '0',
        taxRate: '21',
        exemptionReason: '',
      },
    ],
  });
  await issueDocument(client, userId, quoteDraft.id, quoteDraft.version);

  console.log('Datos del año pasado añadidos correctamente.');
}, true);

await pool.end();
