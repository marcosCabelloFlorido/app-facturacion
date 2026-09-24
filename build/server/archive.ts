import { createHash } from 'node:crypto';
import type { PoolClient } from 'pg';
import type { FinancialDocument, Company } from '../shared/domain.ts';
import { documentPdf } from './pdf.ts';
import { activeTemplate } from './template-assets.ts';

export async function archivePdf(
  client: PoolClient,
  doc: FinancialDocument,
  origin: 'issuance' | 'reconstructed',
) {
  const existing = (
    await client.query('SELECT * FROM document_archives WHERE document_id=$1', [doc.id])
  ).rows[0];
  if (existing) return existing;
  if (!doc.company_snapshot || doc.status === 'draft')
    throw new Error('Solo se archivan documentos confirmados.');
  const template = await activeTemplate(client, doc.kind, doc.id);
  const data = await documentPdf(
    doc,
    doc.company_snapshot as Company,
    template.settings,
    template.logo,
  );
  await client.query(
    'INSERT INTO document_renderings(document_id,template_id,template_version,settings) VALUES($1,$2,$3,$4)',
    [doc.id, template.id, template.version, template.settings],
  );
  const sha256 = createHash('sha256').update(data).digest('hex');
  return (
    await client.query(
      "INSERT INTO document_archives(document_id,data,sha256,renderer_version,origin) VALUES($1,$2,$3,'pdf-v6',$4) RETURNING *",
      [doc.id, data, sha256, origin],
    )
  ).rows[0];
}
