import type { PoolClient } from 'pg';
import { saveDocument, issueDocument, addPayment, quoteAction } from './services.ts';
import type { DocumentInput } from '../shared/domain.ts';
export async function seedDemo(client: PoolClient, userId: string) {
  const products = [
    ['SRV-001', 'Consultoría estratégica', 'Sesión de consultoría y análisis', '95', 'hora'],
    [
      'SRV-002',
      'Diseño de producto',
      'Diseño de interfaz y experiencia de usuario',
      '850',
      'proyecto',
    ],
    ['SRV-003', 'Mantenimiento mensual', 'Soporte y mantenimiento de la plataforma', '240', 'mes'],
    ['SRV-004', 'Desarrollo web', 'Desarrollo e implementación de funcionalidades', '65', 'hora'],
    ['SRV-005', 'Auditoría SEO', 'Análisis y plan de optimización en buscadores', '420', 'proyecto'],
    ['SRV-006', 'Formación de equipo', 'Sesión formativa para el equipo del cliente', '180', 'hora'],
    ['HW-001', 'Licencia software anual', 'Licencia de uso anual de la plataforma', '540', 'unidad'],
    ['HW-002', 'Equipo de red', 'Router y switch para oficina', '310', 'unidad'],
  ];
  for (const [sku, name, description, price, unit] of products)
    await client.query(
      'INSERT INTO products(sku,name,description,unit_price,tax_rate,unit) VALUES($1,$2,$3,$4,21,$5)',
      [sku, name, description, price, unit],
    );
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
    {
      name: 'Taller Levante · DEMO',
      taxId: 'DEMO-LEVANTE',
      address: 'Carrer de Mostra, 22 · Valencia',
      email: 'levante@example.com',
    },
    {
      name: 'Estudio Bilbao · DEMO',
      taxId: 'DEMO-BILBAO',
      address: 'Kale Adibidea, 5 · Bilbao',
      email: 'bilbao@example.com',
    },
    {
      name: 'Nova Canarias · DEMO',
      taxId: 'DEMO-CANARIAS',
      address: 'Calle de Prueba, 40 · Las Palmas',
      email: 'canarias@example.com',
    },
  ];
  const today = new Date(
    new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' }) + 'T12:00:00Z',
  );
  // El mes 12 (mismo mes, año anterior) da datos reales a la comparación interanual.
  for (const m of [12, 5, 4, 3, 2, 1, 0]) {
    const scale = Math.min(m, 5);
    const base = new Date(Date.UTC(today.getFullYear(), today.getMonth() - m, 1, 12));
    for (let i = 0; i < 3; i++) {
      const date = new Date(base);
      date.setUTCDate(m === 12 ? 2 + i * 3 : Math.min(2 + i * 3, today.getDate()));
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
            description: products[i][2],
            quantity: String(2 + i),
            unitPrice: String(310 + (5 - scale) * 95 + i * 75),
            discount: '0',
            taxRate: '21',
            exemptionReason: '',
          },
        ],
      };
      const draft = await saveDocument(client, userId, input);
      const issued = await issueDocument(client, userId, draft.id, draft.version);
      if (m > 1 || (m === 1 && i === 0))
        await addPayment(client, userId, {
          documentId: issued.id,
          amount: issued.total,
          date: issued.date,
          method: 'bank',
          reference: '',
        });
      else if (m === 0 && i === 0)
        await addPayment(client, userId, {
          documentId: issued.id,
          amount: '500.00',
          date: issued.date,
          method: 'bank',
          reference: 'Primer plazo',
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
          unitPrice: String(220 + (5 - scale) * 25),
          discount: '0',
          taxRate: '21',
          exemptionReason: '',
        },
      ],
    });
    const purchase = await issueDocument(client, userId, draft.id, draft.version);
    if (m > 0)
      await addPayment(client, userId, {
        documentId: purchase.id,
        amount: purchase.total,
        date,
        method: 'bank',
        reference: '',
      });
  }
  const date = today.toISOString().slice(0, 10);
  const due = new Date(today);
  due.setUTCDate(due.getUTCDate() + 30);
  const draft: DocumentInput = {
    kind: 'quote',
    date,
    dueDate: due.toISOString().slice(0, 10),
    party: customers[1],
    reference: 'Rediseño 2026',
    notes: 'Validez del presupuesto: 30 días.',
    retentionRate: '0',
    lines: [
      {
        description: 'Diseño y desarrollo de sitio web',
        quantity: '1',
        unitPrice: '3200',
        discount: '0',
        taxRate: '21',
        exemptionReason: '',
      },
    ],
  };
  // Presupuesto en borrador (sin emitir): Rediseño 2026.
  await saveDocument(client, userId, draft);
  // Factura en borrador (sin emitir): Consultoría de septiembre.
  await saveDocument(client, userId, {
    ...draft,
    kind: 'invoice',
    party: customers[2],
    reference: '',
    lines: [{ ...draft.lines[0], description: 'Consultoría de septiembre', unitPrice: '450' }],
  });

  // Presupuestos adicionales con distintos estados, para ver toda la variedad
  // de badges (pendiente, aceptado, rechazado, convertido) en Presupuestos.
  const quoteExample = async (
    party: DocumentInput['party'],
    reference: string,
    description: string,
    unitPrice: string,
  ) => {
    const quoteDraft = await saveDocument(client, userId, {
      kind: 'quote',
      date,
      dueDate: due.toISOString().slice(0, 10),
      party,
      reference,
      notes: 'Presupuesto de demostración. Datos ficticios.',
      retentionRate: '0',
      lines: [
        {
          description,
          quantity: '1',
          unitPrice,
          discount: '0',
          taxRate: '21',
          exemptionReason: '',
        },
      ],
    });
    return issueDocument(client, userId, quoteDraft.id, quoteDraft.version);
  };
  // Presupuesto del mismo mes hace un año, para la comparación interanual.
  const lastYearDate = new Date(Date.UTC(today.getFullYear() - 1, today.getMonth(), 10, 12));
  const lastYearDue = new Date(lastYearDate);
  lastYearDue.setUTCDate(lastYearDue.getUTCDate() + 30);
  const lastYearQuoteDraft = await saveDocument(client, userId, {
    kind: 'quote',
    date: lastYearDate.toISOString().slice(0, 10),
    dueDate: lastYearDue.toISOString().slice(0, 10),
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
  await issueDocument(client, userId, lastYearQuoteDraft.id, lastYearQuoteDraft.version);
  // Pendiente de respuesta.
  await quoteExample(
    customers[3],
    'Campaña de lanzamiento',
    'Estrategia y ejecución de campaña digital',
    '2100',
  );
  // Aceptado por el cliente.
  const acceptedQuote = await quoteExample(
    customers[4],
    'Rediseño de marca',
    'Rediseño completo de identidad de marca',
    '2750',
  );
  await quoteAction(client, userId, acceptedQuote.id, 'accept');
  // Rechazado por el cliente.
  const rejectedQuote = await quoteExample(
    customers[5],
    'Migración de infraestructura',
    'Migración de servidores y bases de datos',
    '1600',
  );
  await quoteAction(client, userId, rejectedQuote.id, 'reject');
  // Aceptado y convertido en factura.
  const convertedQuote = await quoteExample(
    customers[0],
    'Plan anual de soporte',
    'Soporte técnico y mantenimiento anual',
    '3400',
  );
  await quoteAction(client, userId, convertedQuote.id, 'accept');
  await quoteAction(client, userId, convertedQuote.id, 'convert', date);

  // Compra pendiente de contabilizar, para ver el estado "Borrador" en Compras.
  await saveDocument(client, userId, {
    kind: 'purchase',
    date,
    dueDate: due.toISOString().slice(0, 10),
    party: {
      name: 'Papelería Central · DEMO',
      taxId: 'DEMO-PAPEL',
      address: 'Calle del Suministro, 9 · Madrid',
      email: 'papeleria@example.com',
    },
    reference: 'PROV-DEMO-PENDIENTE',
    notes: 'Compra ficticia pendiente de contabilizar.',
    retentionRate: '0',
    lines: [
      {
        description: 'Material de oficina',
        quantity: '1',
        unitPrice: '180',
        discount: '0',
        taxRate: '21',
        exemptionReason: '',
      },
    ],
  });

  // Compra contabilizada con pago parcial, para ver el estado "Parcial" en Compras.
  const partialPurchaseDraft = await saveDocument(client, userId, {
    kind: 'purchase',
    date,
    dueDate: due.toISOString().slice(0, 10),
    party: {
      name: 'Logística Sur · DEMO',
      taxId: 'DEMO-LOGISTICA',
      address: 'Polígono Ejemplo, 4 · Sevilla',
      email: 'logistica@example.com',
    },
    reference: 'PROV-DEMO-PARCIAL',
    notes: 'Compra ficticia con pago parcial.',
    retentionRate: '0',
    lines: [
      {
        description: 'Transporte y distribución',
        quantity: '1',
        unitPrice: '900',
        discount: '0',
        taxRate: '21',
        exemptionReason: '',
      },
    ],
  });
  const partialPurchase = await issueDocument(
    client,
    userId,
    partialPurchaseDraft.id,
    partialPurchaseDraft.version,
  );
  await addPayment(client, userId, {
    documentId: partialPurchase.id,
    amount: '300.00',
    date,
    method: 'bank',
    reference: 'Primer plazo',
  });
}
