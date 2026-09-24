import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { calculate, documentSchema, type FinancialDocument } from '../shared/domain.ts';
import { assert, transaction } from './db.ts';
import { getDocument } from './services.ts';
import { activeTemplate } from './template-assets.ts';
import { documentPdf } from './pdf.ts';

export function documentPreviewRoutes(api: FastifyInstance) {
  api.post(
    '/documents/preview',
    { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } },
    async (req, reply) => {
      const { document: input, documentId } = z
        .object({ document: documentSchema, documentId: z.uuid().optional() })
        .parse(req.body);
      const buffer = await transaction(async (c) => {
        const original = documentId ? await getDocument(c, documentId) : undefined;
        if (original)
          assert(
            original.status === 'draft' && original.kind === input.kind,
            'Solo se pueden previsualizar cambios de un borrador del mismo tipo.',
            400,
          );
        const company = (await c.query('SELECT data FROM company WHERE id=1')).rows[0].data;
        const totals = calculate(input.lines, input.retentionRate);
        const doc: FinancialDocument = {
          id: documentId || '',
          kind: input.kind,
          status: 'draft',
          number: null,
          version: original?.version || 1,
          date: input.date,
          due_date: input.dueDate,
          operation_date: input.operationDate || input.date,
          registration_date: input.registrationDate || input.date,
          series_code: input.seriesCode || null,
          credit_side: input.kind === 'purchase' ? 'purchase' : 'sale',
          buyer_fields: input.buyerFields || {},
          party: input.party,
          reference: input.reference,
          notes: input.notes,
          retention_rate: input.retentionRate,
          ...totals,
          balance: totals.total,
          settled: '0.00',
          company_snapshot: null,
          original_id: null,
          created_at: new Date().toISOString(),
        };
        const template = await activeTemplate(c, input.kind, documentId);
        return documentPdf(doc, company, template.settings, template.logo);
      }, true);
      return reply
        .type('application/pdf')
        .header('Cache-Control', 'no-store')
        .header('Content-Disposition', 'inline; filename="vista-previa.pdf"')
        .send(buffer);
    },
  );
}
