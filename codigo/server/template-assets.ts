import { inflateSync } from 'node:zlib';
import type { PoolClient } from 'pg';
import { assert } from './db.ts';
import {
  defaultTemplate,
  templateSettingsSchema,
  type TemplateSettings,
} from '../shared/templates.ts';
// Bound image dimensions and decoded PNG size before handing untrusted bytes to the renderer.
export function validateLogo(data: Buffer) {
  assert(data.length <= 2 * 1024 * 1024, 'El logo no puede superar 2 MB.', 400);
  if (data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    assert(data.length >= 33 && data.toString('ascii', 12, 16) === 'IHDR', 'PNG no válido.', 400);
    const width = data.readUInt32BE(16),
      height = data.readUInt32BE(20),
      depth = data[24],
      color = data[25];
    assert(
      width > 0 &&
        height > 0 &&
        width <= 2000 &&
        height <= 2000 &&
        depth === 8 &&
        [2, 6].includes(color) &&
        data[28] === 0,
      'Usa un PNG RGB/RGBA de 8 bits, sin entrelazado y de hasta 2000 × 2000 píxeles.',
      400,
    );
    const chunks: Buffer[] = [];
    let pos = 8,
      ended = false;
    while (pos + 12 <= data.length) {
      const len = data.readUInt32BE(pos),
        type = data.toString('ascii', pos + 4, pos + 8);
      assert(pos + 12 + len <= data.length, 'PNG truncado.', 400);
      if (type === 'IDAT') chunks.push(data.subarray(pos + 8, pos + 8 + len));
      pos += 12 + len;
      if (type === 'IEND') {
        ended = true;
        break;
      }
    }
    assert(ended && chunks.length, 'PNG incompleto.', 400);
    const expected = (width * (color === 6 ? 4 : 3) + 1) * height;
    let decoded: Buffer;
    try {
      decoded = inflateSync(Buffer.concat(chunks), { maxOutputLength: expected });
    } catch {
      assert(false, 'Datos PNG no válidos.', 400);
    }
    assert(decoded!.length === expected, 'Datos PNG incompletos.', 400);
    return;
  }
  assert(data[0] === 255 && data[1] === 216, 'El logo debe ser PNG o JPEG.', 400);
  let pos = 2;
  while (pos + 4 < data.length) {
    if (data[pos++] !== 255) break;
    while (data[pos] === 255) pos++;
    const marker = data[pos++];
    if (marker === 0xda || marker === 0xd9) break;
    const len = data.readUInt16BE(pos);
    assert(len >= 2 && pos + len <= data.length, 'JPEG truncado.', 400);
    if ([0xc0, 0xc1, 0xc2].includes(marker)) {
      assert(len >= 8, 'JPEG no válido.', 400);
      const h = data.readUInt16BE(pos + 3),
        w = data.readUInt16BE(pos + 5);
      assert(
        w > 0 && h > 0 && w <= 2000 && h <= 2000,
        'El logo debe medir hasta 2000 × 2000 píxeles.',
        400,
      );
      return;
    }
    pos += len;
  }
  assert(false, 'No se pudo leer el tamaño del JPEG.', 400);
}
export async function templateLogo(c: { query: PoolClient['query'] }, settings: TemplateSettings) {
  if (!settings.logoFileId) return undefined;
  const f = (
    await c.query('SELECT data,mime,document_id FROM active_stored_files WHERE id=$1', [
      settings.logoFileId,
    ])
  ).rows[0];
  assert(
    f && !f.document_id && ['image/png', 'image/jpeg'].includes(f.mime),
    'Selecciona un logo independiente de los adjuntos de facturas.',
    400,
  );
  validateLogo(f.data);
  return f.data as Buffer;
}
export async function activeTemplate(
  c: { query: PoolClient['query'] },
  kind: string,
  documentId?: string,
) {
  const choice = documentId
    ? (
        await c.query('SELECT template_id FROM document_template_choices WHERE document_id=$1', [
          documentId,
        ])
      ).rows[0]
    : null;
  const t = choice?.template_id
    ? (
        await c.query(
          'SELECT * FROM document_templates WHERE id=$1 AND kind=$2 AND archived_at IS NULL',
          [choice.template_id, kind],
        )
      ).rows[0]
    : (
        await c.query(
          'SELECT * FROM document_templates WHERE kind=$1 AND active AND archived_at IS NULL',
          [kind],
        )
      ).rows[0];
  const settings = t ? templateSettingsSchema.parse(t.settings) : defaultTemplate;
  return {
    id: t?.id || null,
    version: t?.version || null,
    settings,
    logo: await templateLogo(c, settings),
  };
}
