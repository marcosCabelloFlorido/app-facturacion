import type { DocumentCustomer } from '../shared/document-list.ts';
import { pool } from './db.ts';

/** Fiscal identities available to the current workspace, including historic invoices. */
export async function listDocumentCustomers(
  ownerId: string | null,
  kind: 'sales' | 'quote' | 'purchase' = 'sales',
): Promise<DocumentCustomer[]> {
  return (
    await pool.query<DocumentCustomer>(
      `WITH parties AS (
        SELECT data AS party, 0 AS priority, updated_at AS changed_at FROM contacts
        WHERE data->>'type'='both' OR data->>'type'=CASE WHEN $2='purchase' THEN 'supplier' ELSE 'customer' END
        UNION ALL
        SELECT party, 1, created_at FROM documents
        WHERE ($2='purchase' AND (kind='purchase' OR (kind='credit' AND credit_side='purchase'))) OR ($2='quote' AND kind='quote') OR ($2='sales' AND (kind='invoice' OR (kind='credit' AND credit_side='sale')))
        UNION ALL
        SELECT w.payload->'party', 2, w.updated_at FROM working_drafts w
        LEFT JOIN documents d ON w.resource_key LIKE 'edit:%'
          AND d.id::text=split_part(w.resource_key,':',2)
        WHERE w.owner_id=$1 AND w.payload->>'kind'=CASE WHEN $2='quote' THEN 'quote' WHEN $2='purchase' THEN 'purchase' ELSE 'invoice' END
          AND (w.resource_key LIKE 'new:%' OR (d.status='draft' AND d.kind=CASE WHEN $2='quote' THEN 'quote' WHEN $2='purchase' THEN 'purchase' ELSE 'invoice' END))
      ), identities AS (
        SELECT upper(regexp_replace(party->>'taxId','[[:space:].-]','','g')) AS tax_id,
          trim(party->>'name') AS name, priority, changed_at FROM parties
      ), customers AS (
        SELECT DISTINCT ON (tax_id) tax_id AS "taxId", name FROM identities
        WHERE length(tax_id) BETWEEN 3 AND 30 AND name<>''
        ORDER BY tax_id,priority,changed_at DESC,name
      ) SELECT * FROM customers ORDER BY lower(name),"taxId"`,
      [ownerId, kind],
    )
  ).rows;
}
