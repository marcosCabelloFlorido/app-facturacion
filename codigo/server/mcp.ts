import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { assert, audit, pool, transaction } from './db.ts';
import { createContact, findContactByTaxId, updateContact, setContactStatus } from './contacts.ts';
import {
  saveDocument,
  issueDocument,
  dashboard,
  getDocument,
  lockDocument,
  addPayment,
  reversePayment,
  quoteAction,
  createCredit,
} from './services.ts';
import { dashboardSummary, monthlyComparison } from './dashboard.ts';
import { listDocuments } from './document-list.ts';
import { contactAddressSchema } from '../shared/contacts.ts';
import { productSchema } from '../shared/domain.ts';

const text = (value: unknown): CallToolResult => ({
  content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }],
});
const fail = (message: string): CallToolResult => ({
  content: [{ type: 'text', text: message }],
  isError: true,
});

const lineShape = z.object({
  description: z.string().trim().min(1).max(500),
  quantity: z.string(),
  unitPrice: z.string(),
  discount: z.string().optional(),
  taxRate: z.enum(['0', '4', '10', '21']),
  exemptionReason: z.string().trim().max(300).optional(),
});
const newCustomerShape = z.object({
  name: z.string().trim().min(2).max(160),
  taxId: z.string().trim().min(3).max(30),
  address: z.string().trim().min(3).max(300),
  email: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  type: z.enum(['customer', 'supplier', 'both']).optional(),
  addressDetails: contactAddressSchema.partial().optional(),
});

const REQUIRED_CUSTOMER_FIELDS = [
  'name (razón social o nombre completo)',
  'taxId (NIF/CIF)',
  'address (dirección fiscal completa en una línea)',
  'email (opcional pero recomendado)',
  'phone (opcional)',
];

function buildParty(contact: { data?: any } & Record<string, any>) {
  return {
    name: contact.name,
    taxId: contact.taxId,
    address: contact.address,
    email: contact.email || '',
  };
}

// Servidor MCP de negocio: herramientas que un asistente de IA puede usar para consultar y operar
// sobre la facturación del espacio de trabajo autenticado por token (ver mcp-auth.ts).
function buildMcpServer(userId: string) {
  const server = new McpServer({ name: 'kronjop-facturacion', version: '1.0.0' });

  server.registerTool(
    'search_contacts',
    {
      title: 'Buscar clientes o proveedores',
      description:
        'Busca clientes y proveedores por nombre, NIF, email o teléfono. Úsalo antes de crear una factura para comprobar si el cliente ya existe.',
      inputSchema: {
        search: z.string().trim().max(150).default(''),
        type: z.enum(['all', 'customer', 'supplier']).default('all'),
        page: z.number().int().min(1).default(1),
      },
    },
    async ({ search, type, page }) => {
      const values: unknown[] = [];
      const conditions: string[] = ['active'];
      if (type !== 'all') {
        values.push(type);
        conditions.push(`data->>'type' IN ($${values.length},'both')`);
      }
      if (search) {
        values.push(`%${search.replace(/[\\%_]/g, '\\$&')}%`);
        conditions.push(
          `concat_ws(' ',data->>'name',data->>'taxId',data->>'email',data->>'phone') ILIKE $${values.length}`,
        );
      }
      const where = 'WHERE ' + conditions.join(' AND ');
      const pageSize = 20;
      values.push(pageSize, (page - 1) * pageSize);
      const rows = (
        await pool.query(
          `SELECT id,data FROM contacts ${where} ORDER BY data->>'name' LIMIT $${values.length - 1} OFFSET $${values.length}`,
          values,
        )
      ).rows.map((r) => ({ id: r.id, ...r.data }));
      return text({ rows });
    },
  );

  server.registerTool(
    'get_contact',
    {
      title: 'Obtener ficha de cliente o proveedor',
      description: 'Devuelve la ficha completa de un cliente o proveedor por id o por NIF/CIF.',
      inputSchema: { id: z.string().uuid().optional(), taxId: z.string().optional() },
    },
    async ({ id, taxId }) => {
      if (!id && !taxId) return fail('Indica id o taxId.');
      if (id) {
        const row = (await pool.query('SELECT id,data FROM contacts WHERE id=$1', [id])).rows[0];
        return row ? text({ id: row.id, ...row.data }) : fail('No se encuentra la ficha.');
      }
      const contact = await findContactByTaxId(taxId!);
      return contact ? text(contact) : fail('No existe ningún cliente o proveedor con ese NIF/CIF.');
    },
  );

  server.registerTool(
    'create_contact',
    {
      title: 'Crear cliente o proveedor',
      description:
        'Da de alta un cliente o proveedor nuevo. Llama primero a search_contacts o get_contact para evitar duplicados.',
      inputSchema: {
        name: z.string().trim().min(2).max(160),
        taxId: z.string().trim().min(3).max(30),
        address: z.string().trim().min(3).max(300),
        email: z.string().trim().optional(),
        phone: z.string().trim().optional(),
        type: z.enum(['customer', 'supplier', 'both']).default('customer'),
        notes: z.string().trim().max(2000).optional(),
      },
    },
    async (input) => {
      try {
        const contact = await transaction((c) => createContact(c, userId, input));
        return text(contact);
      } catch (e: any) {
        return fail(e?.message || 'No se ha podido crear el contacto.');
      }
    },
  );

  server.registerTool(
    'create_invoice',
    {
      title: 'Crear factura, presupuesto o compra',
      description:
        'Crea un borrador de documento (factura, presupuesto o compra) para un cliente/proveedor existente. ' +
        'Es obligatorio identificar al cliente: pasa contactId, o taxId de un cliente existente, o taxId + newCustomer ' +
        'con sus datos para darlo de alta automáticamente. Si el cliente no existe y no se aportan datos suficientes, ' +
        'la herramienta no crea la factura y devuelve qué datos del cliente hacen falta.',
      inputSchema: {
        kind: z.enum(['invoice', 'quote', 'purchase']).default('invoice'),
        contactId: z.string().uuid().optional(),
        taxId: z.string().trim().optional(),
        newCustomer: newCustomerShape.optional(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        reference: z.string().trim().max(100).optional(),
        notes: z.string().trim().max(4000).optional(),
        retentionRate: z.enum(['0', '7', '15', '19']).default('0'),
        lines: z.array(lineShape).min(1).max(100),
        issue: z.boolean().default(false),
      },
    },
    async ({ kind, contactId, taxId, newCustomer, date, dueDate, reference, notes, retentionRate, lines, issue }) => {
      try {
        let contact: any = null;
        if (contactId) {
          const row = (await pool.query('SELECT id,data FROM contacts WHERE id=$1', [contactId])).rows[0];
          if (!row) return fail('No se encuentra el cliente/proveedor indicado en contactId.');
          contact = { id: row.id, ...row.data };
        } else if (taxId) {
          contact = await findContactByTaxId(taxId);
          if (!contact) {
            if (!newCustomer)
              return text({
                status: 'needs_customer_data',
                message:
                  `No existe ningún cliente/proveedor con NIF/CIF "${taxId}". ` +
                  'Pide estos datos al usuario y vuelve a llamar a create_invoice con el mismo taxId ' +
                  'y el campo newCustomer relleno (o crea antes el contacto con create_contact).',
                requiredFields: REQUIRED_CUSTOMER_FIELDS,
              });
            contact = await transaction((c) =>
              createContact(c, userId, { ...newCustomer, taxId }),
            );
          }
        } else {
          return fail('Indica contactId, o taxId (con newCustomer si el cliente es nuevo).');
        }
        const due = dueDate || (() => {
          const d = new Date(date + 'T12:00:00Z');
          d.setUTCDate(d.getUTCDate() + 30);
          return d.toISOString().slice(0, 10);
        })();
        const result = await transaction(async (c) => {
          const doc = await saveDocument(c, userId, {
            kind,
            date,
            dueDate: due,
            party: buildParty(contact),
            reference: reference || '',
            notes: notes || '',
            retentionRate,
            lines: lines.map((l) => ({
              description: l.description,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              discount: l.discount || '0',
              taxRate: l.taxRate,
              exemptionReason: l.exemptionReason || '',
            })),
          });
          return issue ? issueDocument(c, userId, doc.id, doc.version) : doc;
        });
        return text({ status: 'ok', document: result });
      } catch (e: any) {
        return fail(e?.message || 'No se ha podido crear el documento.');
      }
    },
  );

  server.registerTool(
    'search_documents',
    {
      title: 'Buscar facturas, presupuestos o compras',
      description: 'Busca y lista documentos (facturas, presupuestos, compras, rectificativas).',
      inputSchema: {
        kind: z.enum(['invoice', 'quote', 'purchase', 'credit', 'sales']).optional(),
        status: z.string().max(30).optional(),
        search: z.string().max(150).optional(),
        customer: z.string().max(30).optional(),
        page: z.number().int().min(1).default(1),
      },
    },
    async ({ kind, status, search, customer, page }) => {
      const list = await listDocuments(
        { kind, status: status || 'all', search: search || '', customer, page },
        userId,
      );
      return text(list);
    },
  );

  server.registerTool(
    'get_document',
    {
      title: 'Obtener un documento',
      description: 'Devuelve el detalle completo de una factura, presupuesto o compra por id.',
      inputSchema: { id: z.string().uuid() },
    },
    async ({ id }) => {
      try {
        return text(await getDocument(pool, id));
      } catch (e: any) {
        return fail(e?.message || 'No se encuentra el documento.');
      }
    },
  );

  server.registerTool(
    'issue_document',
    {
      title: 'Emitir un borrador',
      description:
        'Confirma y emite un borrador de factura, presupuesto o compra: le asigna número y ya no se puede editar. ' +
        'Necesita el id y la version actuales del borrador (los devuelve create_invoice o get_document).',
      inputSchema: { id: z.string().uuid(), version: z.number().int().positive() },
    },
    async ({ id, version }) => {
      try {
        const result = await transaction((c) => issueDocument(c, userId, id, version));
        return text({ status: 'ok', document: result });
      } catch (e: any) {
        return fail(e?.message || 'No se ha podido emitir el documento.');
      }
    },
  );

  server.registerTool(
    'update_document',
    {
      title: 'Editar un borrador',
      description:
        'Modifica un borrador existente (factura, presupuesto o compra): fecha, referencia, notas, retención o líneas. ' +
        'Solo funciona sobre borradores (no emitidos). Necesita id y version actuales (los devuelve get_document). ' +
        'Si no indicas contactId ni taxId, se mantiene el cliente/proveedor actual.',
      inputSchema: {
        id: z.string().uuid(),
        version: z.number().int().positive(),
        contactId: z.string().uuid().optional(),
        taxId: z.string().trim().optional(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        reference: z.string().trim().max(100).optional(),
        notes: z.string().trim().max(4000).optional(),
        retentionRate: z.enum(['0', '7', '15', '19']).default('0'),
        lines: z.array(lineShape).min(1).max(100),
      },
    },
    async ({ id, version, contactId, taxId, date, dueDate, reference, notes, retentionRate, lines }) => {
      try {
        const current = await getDocument(pool, id);
        assert(current.status === 'draft', 'Solo se pueden editar borradores.');
        let party = current.party;
        if (contactId) {
          const row = (await pool.query('SELECT id,data FROM contacts WHERE id=$1', [contactId])).rows[0];
          if (!row) return fail('No se encuentra el cliente/proveedor indicado en contactId.');
          party = buildParty({ id: row.id, ...row.data });
        } else if (taxId) {
          const contact = await findContactByTaxId(taxId);
          if (!contact) return fail('No existe ningún cliente/proveedor con ese NIF/CIF. Créalo antes con create_contact.');
          party = buildParty(contact);
        }
        const due = dueDate || current.due_date;
        const result = await transaction((c) =>
          saveDocument(
            c,
            userId,
            {
              kind: current.kind as 'invoice' | 'quote' | 'purchase',
              date,
              dueDate: due,
              party,
              reference: reference ?? current.reference ?? '',
              notes: notes ?? current.notes ?? '',
              retentionRate,
              lines: lines.map((l) => ({
                description: l.description,
                quantity: l.quantity,
                unitPrice: l.unitPrice,
                discount: l.discount || '0',
                taxRate: l.taxRate,
                exemptionReason: l.exemptionReason || '',
              })),
            },
            id,
            version,
          ),
        );
        return text({ status: 'ok', document: result });
      } catch (e: any) {
        return fail(e?.message || 'No se ha podido editar el documento.');
      }
    },
  );

  server.registerTool(
    'delete_document',
    {
      title: 'Eliminar un borrador',
      description: 'Elimina un borrador (factura, presupuesto o compra) no emitido. No se puede deshacer.',
      inputSchema: { id: z.string().uuid() },
    },
    async ({ id }) => {
      try {
        await transaction(async (c) => {
          const doc = await lockDocument(c, id);
          assert(doc.status === 'draft', 'Solo se pueden eliminar borradores.');
          await c.query('DELETE FROM documents WHERE id=$1', [id]);
          await audit(c, userId, id, 'Borrador eliminado');
        });
        return text({ status: 'ok' });
      } catch (e: any) {
        return fail(e?.message || 'No se ha podido eliminar el borrador.');
      }
    },
  );

  server.registerTool(
    'quote_action',
    {
      title: 'Aceptar, rechazar o convertir un presupuesto',
      description:
        'Cambia el estado de un presupuesto emitido: accept (lo marca aceptado), reject (lo rechaza) o ' +
        'convert (crea un borrador de factura a partir de un presupuesto ya aceptado; usa create_invoice/issue_document para emitirlo).',
      inputSchema: {
        id: z.string().uuid(),
        action: z.enum(['accept', 'reject', 'convert']),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      },
    },
    async ({ id, action, date }) => {
      try {
        const result = await transaction((c) => quoteAction(c, userId, id, action, date));
        return text({ status: 'ok', document: result });
      } catch (e: any) {
        return fail(e?.message || 'No se ha podido cambiar el estado del presupuesto.');
      }
    },
  );

  server.registerTool(
    'create_credit',
    {
      title: 'Crear una factura rectificativa',
      description:
        'Crea un borrador de rectificativa sobre una factura o compra ya emitida/contabilizada. ' +
        'Si no indicas lines, rectifica todo lo pendiente de cada línea original.',
      inputSchema: {
        id: z.string().uuid(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        reason: z.string().trim().min(5).max(2000),
        lines: z
          .array(z.object({ sourceLine: z.number().int().min(0).max(99), quantity: z.string() }))
          .min(1)
          .max(100)
          .optional(),
      },
    },
    async ({ id, date, reason, lines }) => {
      try {
        const result = await transaction((c) => createCredit(c, userId, id, date, reason, lines));
        return text({ status: 'ok', document: result });
      } catch (e: any) {
        return fail(e?.message || 'No se ha podido crear la rectificativa.');
      }
    },
  );

  server.registerTool(
    'register_payment',
    {
      title: 'Registrar un cobro o pago',
      description:
        'Registra un cobro (sobre una factura) o un pago (sobre una compra) contra un documento emitido/contabilizado. ' +
        'El importe no puede superar el saldo pendiente del documento.',
      inputSchema: {
        documentId: z.string().uuid(),
        amount: z.string().regex(/^\d{1,15}(\.\d{1,2})?$/),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        method: z.enum(['bank', 'cash', 'card']),
        reference: z.string().trim().max(200).default(''),
      },
    },
    async (input) => {
      try {
        const payment = await transaction((c) => addPayment(c, userId, input));
        return text({ status: 'ok', payment });
      } catch (e: any) {
        return fail(e?.message || 'No se ha podido registrar el movimiento.');
      }
    },
  );

  server.registerTool(
    'reverse_payment',
    {
      title: 'Revertir un cobro o pago',
      description: 'Revierte un cobro o pago ya registrado. Necesita el id del movimiento (lo devuelve list_payments).',
      inputSchema: {
        id: z.string().uuid(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        reason: z.string().trim().min(5).max(500),
      },
    },
    async ({ id, date, reason }) => {
      try {
        const result = await transaction((c) => reversePayment(c, userId, id, date, reason));
        return text(result);
      } catch (e: any) {
        return fail(e?.message || 'No se ha podido revertir el movimiento.');
      }
    },
  );

  server.registerTool(
    'list_payments',
    {
      title: 'Listar cobros y pagos',
      description: 'Lista los cobros y pagos registrados, opcionalmente filtrados por documento.',
      inputSchema: { documentId: z.string().uuid().optional() },
    },
    async ({ documentId }) => {
      const rows = documentId
        ? (
            await pool.query('SELECT * FROM payments WHERE document_id=$1 ORDER BY date DESC,created_at DESC', [
              documentId,
            ])
          ).rows
        : (
            await pool.query(
              `SELECT p.*,d.number,d.party->>'name' AS party_name,d.kind
               FROM payments p JOIN documents d ON d.id=p.document_id
               ORDER BY p.date DESC,p.created_at DESC LIMIT 100`,
            )
          ).rows;
      return text({ rows });
    },
  );

  server.registerTool(
    'update_contact',
    {
      title: 'Editar cliente o proveedor',
      description: 'Modifica la ficha de un cliente o proveedor existente. Necesita id y version actuales (los devuelve get_contact).',
      inputSchema: {
        id: z.string().uuid(),
        version: z.number().int().positive(),
        name: z.string().trim().min(2).max(160),
        taxId: z.string().trim().min(3).max(30),
        address: z.string().trim().min(3).max(300),
        email: z.string().trim().optional(),
        phone: z.string().trim().optional(),
        type: z.enum(['customer', 'supplier', 'both']).default('customer'),
        notes: z.string().trim().max(2000).optional(),
        addressDetails: contactAddressSchema.partial().optional(),
      },
    },
    async ({ id, version, ...input }) => {
      try {
        const contact = await transaction((c) => updateContact(c, userId, id, input, version));
        return text(contact);
      } catch (e: any) {
        return fail(e?.message || 'No se ha podido actualizar el contacto.');
      }
    },
  );

  server.registerTool(
    'set_contact_status',
    {
      title: 'Archivar o recuperar cliente/proveedor',
      description: 'Archiva (active=false) o recupera (active=true) un cliente o proveedor. Necesita id y version actuales.',
      inputSchema: { id: z.string().uuid(), version: z.number().int().positive(), active: z.boolean() },
    },
    async ({ id, version, active }) => {
      try {
        const contact = await transaction((c) => setContactStatus(c, userId, id, active, version));
        return text(contact);
      } catch (e: any) {
        return fail(e?.message || 'No se ha podido cambiar el estado del contacto.');
      }
    },
  );

  server.registerTool(
    'create_product',
    {
      title: 'Crear artículo/producto',
      description: 'Da de alta un artículo o producto en el catálogo, para poder reutilizarlo en facturas.',
      inputSchema: {
        sku: z.string().trim().min(1).max(40),
        name: z.string().trim().min(2).max(200),
        description: z.string().trim().max(500).optional(),
        unitPrice: z.string(),
        taxRate: z.enum(['0', '4', '10', '21']),
        exemptionReason: z.string().trim().max(300).optional(),
        unit: z.string().trim().min(1).max(20).default('ud.'),
        active: z.boolean().default(true),
      },
    },
    async (input) => {
      try {
        const b = productSchema.parse(input);
        const r = await transaction(async (c) => {
          const row = (
            await c.query(
              'INSERT INTO products(sku,name,description,unit_price,tax_rate,exemption_reason,unit,active) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
              [b.sku, b.name, b.description, b.unitPrice, b.taxRate, b.exemptionReason, b.unit, b.active],
            )
          ).rows[0];
          await audit(c, userId, row.id, 'Artículo creado');
          return row;
        });
        return text(r);
      } catch (e: any) {
        return fail(e?.message || 'No se ha podido crear el artículo.');
      }
    },
  );

  server.registerTool(
    'update_product',
    {
      title: 'Editar artículo/producto',
      description: 'Modifica un artículo o producto existente del catálogo, o lo desactiva (active=false).',
      inputSchema: {
        id: z.string().uuid(),
        sku: z.string().trim().min(1).max(40),
        name: z.string().trim().min(2).max(200),
        description: z.string().trim().max(500).optional(),
        unitPrice: z.string(),
        taxRate: z.enum(['0', '4', '10', '21']),
        exemptionReason: z.string().trim().max(300).optional(),
        unit: z.string().trim().min(1).max(20).default('ud.'),
        active: z.boolean().default(true),
      },
    },
    async ({ id, ...input }) => {
      try {
        const b = productSchema.parse(input);
        const r = await transaction(async (c) => {
          const row = (
            await c.query(
              'UPDATE products SET sku=$2,name=$3,description=$4,unit_price=$5,tax_rate=$6,exemption_reason=$7,unit=$8,active=$9 WHERE id=$1 RETURNING *',
              [id, b.sku, b.name, b.description, b.unitPrice, b.taxRate, b.exemptionReason, b.unit, b.active],
            )
          ).rows[0];
          assert(row, 'Artículo no encontrado.', 404);
          await audit(c, userId, row.id, 'Artículo actualizado');
          return row;
        });
        return text(r);
      } catch (e: any) {
        return fail(e?.message || 'No se ha podido actualizar el artículo.');
      }
    },
  );

  server.registerTool(
    'get_stats',
    {
      title: 'Cifras y comparativas del negocio',
      description:
        'Devuelve las cifras clave del negocio: ventas, gastos, presupuestos pendientes y saldo a pagar, ' +
        'con comparativas frente al mes y año anteriores.',
      inputSchema: {},
    },
    async () => text(await dashboardSummary()),
  );

  server.registerTool(
    'get_monthly_comparison',
    {
      title: 'Facturación de un mes con comparativa',
      description:
        'Devuelve lo facturado (ventas) y lo gastado en un mes y año concretos, junto con la ' +
        'comparativa frente al mes anterior y frente al mismo mes del año anterior. Úsalo para ' +
        'preguntas como "cuánto facturé en mayo de 2025", incluyendo comparación con abril de 2025 ' +
        'y con mayo de 2024.',
      inputSchema: {
        year: z.number().int().min(2000).max(2100),
        month: z.number().int().min(1).max(12),
      },
    },
    async ({ year, month }) => text(await monthlyComparison(year, month)),
  );

  server.registerTool(
    'get_dashboard',
    {
      title: 'Panel general',
      description:
        'Devuelve el resumen del panel: cifras del mes, evolución mensual de ingresos/gastos, ' +
        'próximos vencimientos y actividad reciente.',
      inputSchema: {},
    },
    async () => text(await dashboard()),
  );

  server.registerTool(
    'list_products',
    {
      title: 'Listar artículos/productos',
      description: 'Lista el catálogo de artículos o productos disponibles para facturar.',
      inputSchema: { activeOnly: z.boolean().default(true) },
    },
    async ({ activeOnly }) => {
      const rows = (
        await pool.query(
          `SELECT id,sku,name,description,unit_price AS "unitPrice",tax_rate::text AS "taxRate",unit,active
           FROM products ${activeOnly ? 'WHERE active' : ''} ORDER BY active DESC,name`,
        )
      ).rows;
      return text(rows);
    },
  );

  return server;
}

// Modo sin estado: una instancia de servidor y de transporte por petición, sin sesiones en memoria.
async function handleMcp(req: FastifyRequest, reply: FastifyReply) {
  const server = buildMcpServer(req.user!.id);
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  reply.raw.on('close', () => {
    transport.close();
    server.close();
  });
  await server.connect(transport);
  reply.hijack();
  await transport.handleRequest(req.raw, reply.raw, req.body);
}

export function mcpRoutes(api: FastifyInstance) {
  api.post('/mcp', handleMcp);
  api.get('/mcp', handleMcp);
  api.delete('/mcp', handleMcp);
}
