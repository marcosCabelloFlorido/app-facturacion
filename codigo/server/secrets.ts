import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { assert } from './db.ts';
export function initializeSecrets() {
  if (process.env.APP_ENCRYPTION_KEY) {
    assert(
      /^[a-f0-9]{64}$/i.test(process.env.APP_ENCRYPTION_KEY),
      'Clave de cifrado del servidor no válida.',
      503,
    );
    return;
  }
  const file = process.env.APP_ENCRYPTION_KEY_FILE;
  assert(file, 'Falta configurar el almacenamiento de cifrado del servidor.', 503);
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
  try {
    writeFileSync(file, randomBytes(32).toString('hex'), { flag: 'wx', mode: 0o600 });
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e;
  }
  const value = readFileSync(file, 'utf8').trim();
  assert(/^[a-f0-9]{64}$/i.test(value), 'El archivo de cifrado no es válido.', 503);
  process.env.APP_ENCRYPTION_KEY = value;
}
function key() {
  if (!process.env.APP_ENCRYPTION_KEY) initializeSecrets();
  return Buffer.from(process.env.APP_ENCRYPTION_KEY!, 'hex');
}
export function seal(value: string, context: string) {
  const iv = randomBytes(12),
    cipher = createCipheriv('aes-256-gcm', key(), iv);
  cipher.setAAD(Buffer.from(context));
  const data = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((v) => v.toString('base64')).join('.');
}
export function unseal(value: string, context: string) {
  const [iv, tag, data] = value.split('.').map((v) => Buffer.from(v, 'base64'));
  const cipher = createDecipheriv('aes-256-gcm', key(), iv);
  cipher.setAAD(Buffer.from(context));
  cipher.setAuthTag(tag);
  return Buffer.concat([cipher.update(data), cipher.final()]).toString('utf8');
}
