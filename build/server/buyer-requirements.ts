import type { FastifyInstance } from 'fastify';
import type { PoolClient } from 'pg';
import { z } from 'zod';
import { pool, assert, audit } from './db.ts';
import { requireAdmin } from './auth.ts';
import { getDocument } from './services.ts';
import { paramId, runCommand } from './finance.ts';
import type { FinancialDocument } from '../shared/domain.ts';
import { buyerFieldNames } from '../shared/buyer-requirements.ts';
const normalize = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');
export async function checkBuyer(c: { query: PoolClient['query'] }, doc: FinancialDocument) {
  const policy = (
    await c.query('SELECT * FROM buyer_policies WHERE tax_id=$1', [normalize(doc.party.taxId)])
  ).rows[0];
  if (!policy || doc.kind !== 'invoice') return { policy: null, missing: [], blocked: false };
  const attachments = (
    await c.query('SELECT id FROM active_stored_files WHERE document_id=$1 LIMIT 1', [doc.id])
  ).rowCount;
  const missing = (policy.required_fields as string[])
    .filter((key) =>
      key === 'attachment'
        ? !attachments
        : key === 'reference'
          ? !doc.reference.trim()
          : !doc.buyer_fields?.[key as keyof FinancialDocument['buyer_fields']]?.trim(),
    )
    .map((key) => ({
      key,
      label: buyerFieldNames[key],
      source: `Requisitos de ${policy.name}, versión ${policy.version}`,
      correction:
        key === 'attachment'
          ? 'Adjunta el original en el detalle del documento.'
          : 'Completa el campo en Fechas de operación y serie, o en Referencia.',
    }));
  return {
    policy: {
      name: policy.name,
      taxId: policy.tax_id,
      version: policy.version,
      severity: policy.severity,
      notes: policy.notes,
    },
    missing,
    blocked: policy.severity === 'block' && missing.length > 0,
  };
}
export async function buyerRoutes(api: FastifyInstance) {
  api.get(
    '/buyer-policies',
    async () => (await pool.query('SELECT * FROM buyer_policies ORDER BY name')).rows,
  );
  api.put('/buyer-policies/:taxId', async (req) => {
    requireAdmin(req);
    const taxId = normalize(
      z
        .string()
        .min(3)
        .max(40)
        .parse((req.params as any).taxId),
    );
    assert(taxId.length >= 3, 'Identificador fiscal no válido', 400);
    const b = z
      .object({
        name: z.string().trim().min(2).max(160),
        version: z.number().int().min(0),
        requiredFields: z
          .array(z.enum(['reference', 'purchaseOrder', 'costCenter', 'contract', 'attachment']))
          .max(5),
        severity: z.enum(['warning', 'block']),
        notes: z.string().trim().max(1000),
      })
      .parse(req.body);
    return runCommand(req, async (c) => {
      await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', ['buyer:' + taxId]);
      const old = (
        await c.query('SELECT version FROM buyer_policies WHERE tax_id=$1 FOR UPDATE', [taxId])
      ).rows[0];
      assert(
        (old?.version || 0) === b.version,
        'Los requisitos han cambiado. Recarga antes de guardar.',
      );
      const data = (
        await c.query(
          'INSERT INTO buyer_policies(tax_id,name,required_fields,severity,notes) VALUES($1,$2,$3,$4,$5) ON CONFLICT(tax_id) DO UPDATE SET name=excluded.name,required_fields=excluded.required_fields,severity=excluded.severity,notes=excluded.notes,version=buyer_policies.version+1 RETURNING *',
          [taxId, b.name, Array.from(new Set(b.requiredFields)), b.severity, b.notes],
        )
      ).rows[0];
      await c.query(
        'INSERT INTO buyer_policy_versions(tax_id,version,data,created_by) VALUES($1,$2,$3,$4)',
        [taxId, data.version, data, req.user!.id],
      );
      await audit(c, req.user!.id, taxId, 'Requisitos del comprador actualizados', {
        version: data.version,
        requiredFields: b.requiredFields,
        severity: b.severity,
      });
      return data;
    });
  });
  api.get('/documents/:id/requirements', async (req) => {
    const id = paramId(req);
    const d = await getDocument(pool, id);
    const saved = (
      await pool.query('SELECT report FROM issued_requirement_checks WHERE document_id=$1', [id])
    ).rows[0];
    return saved?.report || checkBuyer(pool as any, d);
  });
}
