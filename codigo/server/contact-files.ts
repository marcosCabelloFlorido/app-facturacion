import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { assert, transaction } from './db.ts';
import { contactIdentity } from './contact-balances.ts';

// Mounted under the authenticated contacts routes; transactions use the member's workspace schema.
export function contactFilesRoutes(api: FastifyInstance) {
  api.get('/contacts/:id/files', async (req) => {
    assert(req.user && req.workspace, 'Inicia sesión para continuar.', 401);
    const { id } = z.object({ id: z.uuid() }).parse(req.params);
    const { page, search } = z
      .object({
        page: z.coerce.number().int().min(1).max(100000).default(1),
        search: z.string().trim().max(150).default(''),
      })
      .parse(req.query);
    return transaction(async (c) => {
      const contact = (await c.query('SELECT tax_key FROM contacts WHERE id=$1', [id])).rows[0];
      assert(contact, 'No se encuentra la ficha.', 404);
      const params = [contact.tax_key, search];
      const source = `FROM active_stored_files f JOIN documents d ON d.id=f.document_id
        WHERE ${contactIdentity('d', '$1')} AND ($2='' OR strpos(lower(f.filename),lower($2))>0 OR strpos(lower(coalesce(d.number,'')),lower($2))>0)`;
      const count = Number((await c.query('SELECT count(*) ' + source, params)).rows[0].count);
      const rows = (
        await c.query(
          `SELECT f.id,f.filename,f.mime,f.size,f.created_at,d.id AS document_id,d.number,d.kind
        ${source} ORDER BY f.created_at DESC,f.id DESC LIMIT 20 OFFSET $3`,
          [...params, (page - 1) * 20],
        )
      ).rows;
      return { rows, count, page, pageSize: 20 };
    }, true);
  });
}
