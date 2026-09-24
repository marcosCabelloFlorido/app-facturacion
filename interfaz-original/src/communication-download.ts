import { downloadUrl } from './api';
export async function previewPdf(path: string, body: unknown, signal?: AbortSignal) {
  const response = await fetch(downloadUrl(path), {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'kronjop' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'No se pudo preparar el PDF.');
  }
  return URL.createObjectURL(await response.blob());
}
export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
