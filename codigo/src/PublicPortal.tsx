import { useEffect, useState } from 'react';
import { DocumentSheet } from './DocumentSheet';
import { ErrorBox, Loading, PageHeading, Field } from './components';
import { downloadBlob } from './communication-download';
import type { FinancialDocument, Company } from '../shared/domain';
import './communications.css';
type PortalData = {
  document: FinancialDocument & { company: Company };
  sha256: string;
  files: { id: string; filename: string }[];
  expiresAt: string;
  canSign: boolean;
  receipt: { decision: string; signer_name: string; created_at: string } | null;
  declaration: string;
};
export function PublicPortal() {
  const [data, setData] = useState<PortalData | null>(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [name, setName] = useState(''),
    [consent, setConsent] = useState(false),
    [decision, setDecision] = useState<'accept' | 'reject'>('accept');
  const [access] = useState(() => {
    const [workspaceId, token] = location.hash.slice(1).split('.');
    return { workspaceId, token };
  });
  async function request(path: string, extra: object = {}, binary = false) {
    const r = await fetch('/api/portal/' + path, {
      method: 'POST',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'kronjop' },
      body: JSON.stringify({ ...access, ...extra }),
    });
    if (!r.ok) {
      const e = await r.json();
      throw Error(e.message || 'No se pudo abrir el documento.');
    }
    return binary ? r.blob() : r.json();
  }
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    request('document')
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  async function download(path: string, extra: object, filename: string) {
    setBusy(true);
    setError('');
    try {
      downloadBlob(await request(path, extra, true), filename);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="public-portal">
      <PageHeading title={data?.document.number || 'Documento compartido'} tools={null} />
      <main className="page-content">
        <div className="public-portal-content">
          {error && <ErrorBox>{error}</ErrorBox>}
          {loading ? (
            <Loading />
          ) : data ? (
            <>
              <section className="panel communications-panel">
                <div className="communication-inline-actions">
                  <button
                    className="button primary"
                    disabled={busy}
                    onClick={() =>
                      download('pdf', {}, (data.document.number || 'documento') + '.pdf')
                    }
                  >
                    Descargar PDF
                  </button>
                  <span className="muted">
                    Enlace válido hasta {new Date(data.expiresAt).toLocaleDateString('es-ES')}
                  </span>
                </div>
                {data.files.map((f) => (
                  <button
                    key={f.id}
                    className="quiet-link"
                    disabled={busy}
                    onClick={() => download('file', { fileId: f.id }, f.filename)}
                  >
                    Descargar {f.filename}
                  </button>
                ))}
              </section>
              <div className="document-summary">
                <DocumentSheet
                  doc={{ ...data.document, company_snapshot: data.document.company }}
                  company={data.document.company}
                />
              </div>
              {data.receipt ? (
                <section className="panel communications-panel">
                  <p role="status">
                    Presupuesto {data.receipt.decision === 'accept' ? 'aceptado' : 'rechazado'} por{' '}
                    {data.receipt.signer_name} el{' '}
                    {new Date(data.receipt.created_at).toLocaleString('es-ES')}.
                  </p>
                </section>
              ) : data.canSign ? (
                <section className="panel communications-panel">
                  <h2>Responder al presupuesto</h2>
                  <form
                    className="communication-form"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setBusy(true);
                      setError('');
                      try {
                        await request('sign', { name, decision, consent, sha256: data.sha256 });
                        setData(await request('document'));
                      } catch (e) {
                        setError((e as Error).message);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    <Field label="Nombre y apellidos">
                      <input
                        required
                        minLength={3}
                        maxLength={160}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </Field>
                    <fieldset>
                      <legend>Decisión</legend>
                      <label className="checkbox-row">
                        <input
                          type="radio"
                          name="decision"
                          checked={decision === 'accept'}
                          onChange={() => setDecision('accept')}
                        />
                        Aceptar presupuesto
                      </label>
                      <label className="checkbox-row">
                        <input
                          type="radio"
                          name="decision"
                          checked={decision === 'reject'}
                          onChange={() => setDecision('reject')}
                        />
                        Rechazar presupuesto
                      </label>
                    </fieldset>
                    <label className="checkbox-row">
                      <input
                        type="checkbox"
                        required
                        checked={consent}
                        onChange={(e) => setConsent(e.target.checked)}
                      />
                      {data.declaration}
                    </label>
                    <p>
                      La respuesta queda vinculada al PDF. La identidad es declarada; no se utiliza
                      un certificado electrónico.
                    </p>
                    <button className="button primary" disabled={busy || !consent}>
                      {busy
                        ? 'Registrando…'
                        : decision === 'accept'
                          ? 'Confirmar aceptación'
                          : 'Confirmar rechazo'}
                    </button>
                  </form>
                </section>
              ) : null}
              <details className="portal-proof">
                <summary>Identificación del documento</summary>
                <p className="document-hash">SHA-256: {data.sha256}</p>
              </details>
            </>
          ) : (
            <p>Comprueba el enlace o solicita uno nuevo a quien te envió el documento.</p>
          )}
        </div>
      </main>
    </div>
  );
}
