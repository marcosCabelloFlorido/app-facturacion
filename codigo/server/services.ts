import { createHash } from 'node:crypto';
import { Decimal } from 'decimal.js';
import type { PoolClient } from 'pg';
import {
  calculate,
  documentSchema,
  money,
  type DocumentInput,
  type FinancialDocument,
} from '../shared/domain.ts';
import { assert, audit, pool, transaction } from './db.ts';
import { archivePdf } from './archive.ts';
import {checkBuyer} from './buyer-requirements.ts';
import { dashboardDueDates } from './due-dates.ts';
import { dashboardSummarySql } from './dashboard.ts';

export async function command<T>(
  key: string,
  userId: string,
  path: string,
  body: unknown,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const fingerprint = createHash('sha256').update(JSON.stringify({ path, body })).digest('hex');
  return transaction(async (client) => {
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [key]);
    const existing = (await client.query('SELECT * FROM idempotency_keys WHERE key=$1', [key]))
      .rows[0];
    if (existing) {
      assert(
        existing.actor_id === userId && existing.request_hash === fingerprint,
        'La clave de operación ya se utilizó con otros datos.',
      );
      return existing.response as T;
    }
    const result = await fn(client);
    await client.query(
      'INSERT INTO idempotency_keys(key,actor_id,request_hash,response) VALUES($1,$2,$3,$4)',
      [key, userId, fingerprint, JSON.stringify(result)],
    );
    return result;
  });
}
export async function getDocument(
  client: { query: (sql: string, values?: unknown[]) => Promise<{ rows: any[] }> },
  id: string,
): Promise<FinancialDocument> {
  const doc = (await client.query('SELECT * FROM document_balances WHERE id=$1', [id])).rows[0];
  assert(doc, 'No se encuentra el documento.', 404);
  return doc;
}
export async function lockDocument(client: PoolClient, id: string) {
  const result = (await client.query('SELECT * FROM documents WHERE id=$1 FOR UPDATE', [id]))
    .rows[0];
  assert(result, 'No se encuentra el documento.', 404);
  return result as FinancialDocument;
}
export async function openPeriod(client: PoolClient, date: string) {
  await client.query(
    "INSERT INTO periods(month) VALUES(date_trunc('month',$1::date)::date) ON CONFLICT DO NOTHING",
    [date],
  );
  const period = (
    await client.query(
      "SELECT * FROM periods WHERE month=date_trunc('month',$1::date)::date FOR SHARE",
      [date],
    )
  ).rows[0];
  assert(
    !period.closed_at,
    'El periodo contable está cerrado. Elige una fecha en un periodo abierto.',
  );
}
export async function saveDocument(
  client: PoolClient,
  userId: string,
  input: DocumentInput,
  id?: string,
  version?: number,
) {
  const data = documentSchema.parse(input);
  assert(
    !data.operationDate || data.operationDate <= data.date,
    'La fecha de operación no puede superar la fecha del documento.',
    400,
  );
  assert(
    !data.registrationDate || data.registrationDate >= data.date,
    'La fecha de registro no puede ser anterior al documento.',
    400,
  );
  assert(
    data.kind === 'purchase' || !data.registrationDate || data.registrationDate === data.date,
    'En ventas la fecha de registro coincide con la emisión.',
    400,
  );
  if (data.seriesCode) {
    const series = (
      await client.query('SELECT kind,active FROM series_config WHERE code=$1', [data.seriesCode])
    ).rows[0];
    assert(
      series?.active && series.kind === data.kind,
      'La serie no está disponible para este documento.',
      400,
    );
  }
  const totals = calculate(data.lines, data.retentionRate);
  assert(new Decimal(totals.total).gt(0), 'El total del documento debe ser mayor que cero.', 400);
  let docId: string;
  if (id) {
    const current = await lockDocument(client, id);
    assert(current.status === 'draft', 'Solo se pueden editar borradores.');
    assert(
      current.kind !== 'credit',
      'Las rectificativas conservan los importes de la factura original.',
    );
    assert(
      current.version === version,
      'Otra sesión ha modificado este borrador. Recarga los datos.',
    );
    assert(current.kind === data.kind, 'El tipo de documento no puede cambiar.');
    await client.query(
      'UPDATE documents SET date=$2,due_date=$3,party=$4,reference=$5,notes=$6,retention_rate=$7,lines=$8,net=$9,tax=$10,retention=$11,total=$12,version=version+1 WHERE id=$1',
      [
        id,
        data.date,
        data.dueDate,
        data.party,
        data.reference,
        data.notes,
        data.retentionRate,
        JSON.stringify(totals.lines),
        totals.net,
        totals.tax,
        totals.retention,
        totals.total,
      ],
    );
    docId = id;
  } else {
    docId = (
      await client.query(
        'INSERT INTO documents(kind,date,due_date,party,reference,notes,retention_rate,lines,net,tax,retention,total,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id',
        [
          data.kind,
          data.date,
          data.dueDate,
          data.party,
          data.reference,
          data.notes,
          data.retentionRate,
          JSON.stringify(totals.lines),
          totals.net,
          totals.tax,
          totals.retention,
          totals.total,
          userId,
        ],
      )
    ).rows[0].id;
  }
  await client.query(
    'UPDATE documents SET operation_date=$2,registration_date=$3,series_code=$4 WHERE id=$1',
    [
      docId,
      data.operationDate || data.date,
      data.registrationDate || data.date,
      data.seriesCode || null,
    ],
  );
  await client.query('UPDATE documents SET buyer_fields=$2 WHERE id=$1',[docId,data.buyerFields||{}]);
  await audit(client, userId, docId, id ? 'Borrador actualizado' : 'Borrador creado');
  return getDocument(client, docId);
}
export type EntryLine = { account: string; debit: string; credit: string };
export async function postEntry(
  client: PoolClient,
  userId: string,
  date: string,
  description: string,
  lines: EntryLine[],
  documentId: string | null = null,
  paymentId: string | null = null,
  event = 'manual',
) {
  await openPeriod(client, date);
  const filtered = lines.filter((l) => new Decimal(l.debit).gt(0) || new Decimal(l.credit).gt(0));
  const debit = filtered.reduce((a, l) => a.plus(l.debit), new Decimal(0));
  const credit = filtered.reduce((a, l) => a.plus(l.credit), new Decimal(0));
  assert(
    filtered.length >= 2 && debit.eq(credit),
    'El asiento debe tener al menos dos líneas y el mismo debe y haber.',
    400,
  );
  const id = (
    await client.query(
      'INSERT INTO journal_entries(date,description,document_id,payment_id,event,created_by) VALUES($1,$2,$3,$4,$5,$6) RETURNING id',
      [date, description, documentId, paymentId, event, userId],
    )
  ).rows[0].id;
  for (const line of filtered)
    await client.query(
      'INSERT INTO journal_lines(entry_id,account,debit,credit) VALUES($1,$2,$3,$4)',
      [id, line.account, line.debit, line.credit],
    );
  return id;
}
const dr = (account: string, amount: string): EntryLine => ({
  account,
  debit: amount,
  credit: '0',
});
const cr = (account: string, amount: string): EntryLine => ({
  account,
  debit: '0',
  credit: amount,
});
export async function issueDocument(
  client: PoolClient,
  userId: string,
  id: string,
  version: number,
) {
  // Credit operations lock the original first, then the correction, matching payments and applications.
  const info = (await client.query('SELECT original_id FROM documents WHERE id=$1', [id])).rows[0];
  assert(info, 'Documento no encontrado.', 404);
  if (info.original_id) await lockDocument(client, info.original_id);
  const doc = await lockDocument(client, id);
  assert(doc.status === 'draft', 'El documento ya está confirmado.');
  assert(doc.version === version, 'El borrador ha cambiado. Recarga antes de confirmar.');
  const buyerCheck=await checkBuyer(client,doc);
  assert(!buyerCheck.blocked,'Faltan requisitos del comprador: '+buyerCheck.missing.map(v=>v.label).join(', '),400);
  await client.query('INSERT INTO issued_requirement_checks(document_id,report) VALUES($1,$2)',[id,buyerCheck]);
  assert(
    doc.kind !== 'purchase' || doc.reference.trim().length > 0,
    'Indica el número de la factura del proveedor.',
    400,
  );
  await openPeriod(client, doc.registration_date || doc.date);
  const company = (await client.query('SELECT data FROM company WHERE id=1')).rows[0].data;
  const year = Number(doc.date.slice(0, 4));
  let number: string;
  if (doc.series_code) {
    const config = (
      await client.query('SELECT * FROM series_config WHERE code=$1 FOR SHARE', [doc.series_code])
    ).rows[0];
    assert(
      config?.active && config.kind === doc.kind,
      'La serie está desactivada o no corresponde al documento.',
    );
    await client.query(
      'INSERT INTO series_counters(code,year) VALUES($1,$2) ON CONFLICT DO NOTHING',
      [doc.series_code, year],
    );
    const counter = (
      await client.query('SELECT * FROM series_counters WHERE code=$1 AND year=$2 FOR UPDATE', [
        doc.series_code,
        year,
      ])
    ).rows[0];
    assert(
      !counter.last_date || doc.date >= counter.last_date,
      'La fecha es anterior a la última emisión de esta serie.',
    );
    number = `${doc.series_code}-${year}-${String(counter.last_number + 1).padStart(4, '0')}`;
    await client.query(
      'UPDATE series_counters SET last_number=last_number+1,last_date=$3 WHERE code=$1 AND year=$2',
      [doc.series_code, year, doc.date],
    );
  } else {
    await client.query('INSERT INTO series(kind,year) VALUES($1,$2) ON CONFLICT DO NOTHING', [
      doc.kind,
      year,
    ]);
    const series = (
      await client.query('SELECT * FROM series WHERE kind=$1 AND year=$2 FOR UPDATE', [
        doc.kind,
        year,
      ])
    ).rows[0];
    assert(
      !series.last_date || doc.date >= series.last_date,
      'La fecha es anterior a la última emisión de esta serie.',
    );
    const prefix: Record<string, string> = { invoice: 'F', quote: 'P', purchase: 'C', credit: 'R' };
    number = `${prefix[doc.kind]}-${year}-${String(series.last_number + 1).padStart(4, '0')}`;
    await client.query(
      'UPDATE series SET last_number=last_number+1,last_date=$3 WHERE kind=$1 AND year=$2',
      [doc.kind, year, doc.date],
    );
  }
  const status = doc.kind === 'quote' ? 'sent' : doc.kind === 'purchase' ? 'recorded' : 'issued';
  await client.query(
    'UPDATE documents SET status=$2,number=$3,company_snapshot=$4,issued_at=now(),version=version+1 WHERE id=$1',
    [id, status, number, company],
  );
  if (doc.kind !== 'quote') {
    let lines =
      doc.kind === 'purchase' || doc.credit_side === 'purchase'
        ? [dr('600', doc.net), dr('472', doc.tax), cr('400', doc.total), cr('4751', doc.retention)]
        : [dr('430', doc.total), dr('473', doc.retention), cr('700', doc.net), cr('477', doc.tax)];
    if (doc.kind === 'credit')
      lines = lines.map((l) => ({ account: l.account, debit: l.credit, credit: l.debit }));
    await postEntry(
      client,
      userId,
      doc.registration_date || doc.date,
      `${number} · ${doc.party.name}`,
      lines,
      id,
      null,
      'issue',
    );
    if (doc.kind !== 'purchase') {
      const payload = {
        number,
        date: doc.date,
        company,
        party: doc.party,
        lines: doc.lines,
        total: doc.total,
        kind: doc.kind,
        originalId: doc.original_id,
        mode: 'development',
      };
      await client.query('INSERT INTO fiscal_records(document_id,payload,hash) VALUES($1,$2,$3)', [
        id,
        payload,
        createHash('sha256').update(JSON.stringify(payload)).digest('hex'),
      ]);
    }
    if (doc.kind === 'credit') {
      const original = await getDocument(client, doc.original_id!);
      if (new Decimal(original.balance).gt(0))
        await client.query(
          'INSERT INTO credit_applications(credit_id,invoice_id,amount) VALUES($1,$2,$3)',
          [id, original.id, money(Decimal.min(original.balance, doc.total))],
        );
      await audit(client, userId, original.id, 'Factura rectificada', { creditId: id, number });
    }
  }
  await audit(
    client,
    userId,
    id,
    doc.kind === 'quote'
      ? 'Presupuesto confirmado (sin envío automático)'
      : doc.kind === 'purchase'
        ? 'Compra contabilizada'
        : 'Documento emitido en desarrollo',
    { number },
  );
  await archivePdf(client, await getDocument(client, id), 'issuance');
  return getDocument(client, id);
}
export async function createCredit(
  client: PoolClient,
  userId: string,
  id: string,
  date: string,
  reason: string,
  selected?: { sourceLine: number; quantity: string }[],
) {
  const original = await lockDocument(client, id);
  assert(
    ['invoice', 'purchase'].includes(original.kind) &&
      ['issued', 'recorded'].includes(original.status),
    'Solo se puede rectificar una factura emitida o una compra contabilizada.',
  );
  assert(date >= original.date, 'La fecha no puede ser anterior a la factura original.', 400);
  const prior = (
    await client.query("SELECT lines FROM documents WHERE original_id=$1 AND status='issued'", [id])
  ).rows;
  const used = new Map<number, Decimal>();
  for (const p of prior)
    p.lines.forEach((line: any, index: number) => {
      const pos = line.sourceLine ?? index;
      used.set(pos, (used.get(pos) || new Decimal(0)).plus(line.quantity));
    });
  const choices =
    selected ||
    original.lines
      .map((line, index) => ({
        sourceLine: index,
        quantity: Decimal.max(0, new Decimal(line.quantity).minus(used.get(index) || 0)).toString(),
      }))
      .filter((l) => new Decimal(l.quantity).gt(0));
  assert(choices.length > 0, 'No quedan cantidades por rectificar.');
  assert(
    new Set(choices.map((l) => l.sourceLine)).size === choices.length,
    'Se han repetido líneas.',
    400,
  );
  const lines = choices.map((choice) => {
    const line = original.lines[choice.sourceLine];
    assert(
      line &&
        new Decimal(choice.quantity).gt(0) &&
        new Decimal(choice.quantity).plus(used.get(choice.sourceLine) || 0).lte(line.quantity),
      'La cantidad supera lo pendiente de rectificar.',
      400,
    );
    return { ...line, sourceLine: choice.sourceLine, quantity: choice.quantity };
  });
  const totals = calculate(lines, original.retention_rate);
  assert(new Decimal(totals.total).gt(0), 'La rectificación debe tener un importe positivo.', 400);
  const result = await client.query(
    "INSERT INTO documents(kind,date,due_date,party,reference,notes,retention_rate,lines,net,tax,retention,total,original_id,created_by,credit_side,operation_date,registration_date) SELECT 'credit',$2,$2,party,number,$3,retention_rate,$5,$6,$7,$8,$9,id,$4,CASE WHEN kind='purchase' THEN 'purchase' ELSE 'sale' END,operation_date,$2 FROM documents WHERE id=$1 RETURNING id",
    [
      id,
      date,
      reason,
      userId,
      JSON.stringify(totals.lines),
      totals.net,
      totals.tax,
      totals.retention,
      totals.total,
    ],
  );
  await audit(client, userId, result.rows[0].id, 'Borrador de rectificativa creado', {
    originalId: id,
  });
  return getDocument(client, result.rows[0].id);
}
export async function addPayment(
  client: PoolClient,
  userId: string,
  input: { documentId: string; amount: string; date: string; method: string; reference: string },
) {
  await lockDocument(client, input.documentId);
  const doc = await getDocument(client, input.documentId);
  assert(
    ['issued', 'recorded'].includes(doc.status) && doc.kind !== 'quote',
    'El documento debe estar confirmado.',
  );
  assert(
    new Decimal(input.amount).gt(0) && new Decimal(input.amount).lte(doc.balance),
    'El importe debe ser positivo y no superar el saldo pendiente.',
    400,
  );
  assert(input.date >= doc.date, 'El pago no puede ser anterior a la factura.', 400);
  await openPeriod(client, input.date);
  const payment = (
    await client.query(
      'INSERT INTO payments(document_id,amount,date,method,reference,created_by) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',
      [doc.id, input.amount, input.date, input.method, input.reference, userId],
    )
  ).rows[0];
  const bank = input.method === 'cash' ? '570' : '572';
  const lines =
    doc.kind === 'invoice' || (doc.kind === 'credit' && doc.credit_side === 'purchase')
      ? [dr(bank, input.amount), cr(doc.kind === 'invoice' ? '430' : '400', input.amount)]
      : [dr(doc.kind === 'purchase' ? '400' : '430', input.amount), cr(bank, input.amount)];
  await postEntry(
    client,
    userId,
    input.date,
    `${doc.kind === 'invoice' ? 'Cobro' : 'Pago'} ${doc.number}`,
    lines,
    doc.id,
    payment.id,
    'payment',
  );
  await audit(
    client,
    userId,
    doc.id,
    doc.kind === 'invoice' ? 'Cobro registrado' : 'Pago registrado',
    { amount: input.amount, paymentId: payment.id },
  );
  return payment;
}
export async function reversePayment(
  client: PoolClient,
  userId: string,
  id: string,
  date: string,
  reason: string,
) {
  const lookup = (await client.query('SELECT document_id FROM payments WHERE id=$1', [id])).rows[0];
  assert(lookup, 'Pago no encontrado.', 404);
  await lockDocument(client, lookup.document_id);
  const payment = (await client.query('SELECT * FROM payments WHERE id=$1 FOR UPDATE', [id]))
    .rows[0];
  assert(!payment.reversed_at, 'El movimiento ya se ha revertido.');
  assert(date >= payment.date, 'La reversión no puede ser anterior al movimiento.', 400);
  await openPeriod(client, date);
  const lines = (
    await client.query(
      "SELECT l.account,l.credit AS debit,l.debit AS credit FROM journal_lines l JOIN journal_entries e ON e.id=l.entry_id WHERE e.payment_id=$1 AND e.event='payment'",
      [id],
    )
  ).rows;
  await client.query(
    'UPDATE payments SET reversed_at=now(),reversal_date=$2,reversal_reason=$3 WHERE id=$1',
    [id, date, reason],
  );
  await postEntry(
    client,
    userId,
    date,
    `Reversión · ${reason}`,
    lines,
    payment.document_id,
    id,
    'reversal',
  );
  await audit(client, userId, payment.document_id, 'Movimiento revertido', {
    paymentId: id,
    reason,
    date,
  });
  return { ok: true };
}
export async function quoteAction(
  client: PoolClient,
  userId: string,
  id: string,
  action: string,
  date?: string,
) {
  const doc = await lockDocument(client, id);
  assert(doc.kind === 'quote', 'El documento no es un presupuesto.');
  if (action === 'convert') {
    assert(doc.status === 'accepted', 'Acepta el presupuesto antes de convertirlo.');
    assert(date, 'Indica la fecha de la factura.', 400);
    const due = new Date(date + 'T12:00:00Z');
    due.setUTCDate(due.getUTCDate() + 30);
    const invoice = await saveDocument(client, userId, {
      kind: 'invoice',
      date,
      dueDate: due.toISOString().slice(0, 10),
      party: doc.party,
      reference: doc.number!,
      notes: doc.notes,
      retentionRate: doc.retention_rate as DocumentInput['retentionRate'],
      lines: doc.lines,
    });
    await client.query(
      "UPDATE documents SET status='converted',converted_id=$2,version=version+1 WHERE id=$1",
      [id, invoice.id],
    );
    await audit(client, userId, id, 'Presupuesto convertido a borrador de factura', {
      invoiceId: invoice.id,
    });
    return invoice;
  }
  assert(
    doc.status === 'sent' && ['accept', 'reject'].includes(action),
    'Transición de presupuesto no permitida.',
  );
  if (action === 'accept') {
    const { expired } = (
      await client.query('SELECT $1::date<CURRENT_DATE AS expired', [doc.due_date])
    ).rows[0];
    assert(!expired, 'El presupuesto ha caducado. Crea una nueva revisión antes de aceptarlo.');
  }
  await client.query('UPDATE documents SET status=$2,version=version+1 WHERE id=$1', [
    id,
    action === 'accept' ? 'accepted' : 'rejected',
  ]);
  await audit(
    client,
    userId,
    id,
    action === 'accept' ? 'Presupuesto aceptado' : 'Presupuesto rechazado',
  );
  return getDocument(client, id);
}
export async function dashboard() {
  const { rows } = await pool.query(dashboardSummarySql);
  const monthly = (
    await pool.query(`SELECT to_char(m.month,'YYYY-MM') AS month,
    coalesce(sum(CASE WHEN d.kind='invoice' THEN d.net WHEN d.kind='credit' AND d.credit_side='sale' THEN -d.net ELSE 0 END),0) AS revenue,
    coalesce(sum(CASE WHEN d.kind='purchase' THEN d.net WHEN d.kind='credit' AND d.credit_side='purchase' THEN -d.net ELSE 0 END),0) AS expenses
    FROM generate_series(date_trunc('month',CURRENT_DATE)-interval '5 months',date_trunc('month',CURRENT_DATE),interval '1 month') AS m(month)
    LEFT JOIN documents d ON date_trunc('month',d.date)=m.month AND d.status IN ('issued','recorded') GROUP BY m.month ORDER BY m.month`)
  ).rows;
  const dueDates = await dashboardDueDates();
  const recent = (
    await pool.query(
      'SELECT a.action,a.created_at,u.name AS actor,d.number,d.party FROM audit_events a LEFT JOIN public.users u ON u.id=a.actor_id LEFT JOIN documents d ON d.id::text=a.entity_id ORDER BY a.id DESC LIMIT 8',
    )
  ).rows;
  return { ...rows[0], monthly, dueDates, recent };
}
