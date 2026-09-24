import { useState, type FormEvent } from 'react';
import { Check, Store } from 'lucide-react';
import { api } from './api';
import { ErrorBox, Field, Loading, Modal, PanelHeading, Submit, useRemote } from './components';
import { labels, type User } from '../shared/domain';

type Workspace = { id: string; name: string; role: User['role'] };
export function Workspaces({
  currentId,
  onSelect,
  creating,
  onCreatingChange,
}: {
  currentId: string;
  onSelect: (id: string) => Promise<void>;
  creating: boolean;
  onCreatingChange: (value: boolean) => void;
}) {
  const [revision, setRevision] = useState(0);
  const { data, error: loadError, loading } = useRemote<Workspace[]>('/workspaces', revision);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [company, setCompany] = useState({ name: '', taxId: '', address: '', email: '' });
  async function select(id: string) {
    if (busy || id === currentId) return;
    setBusy(true);
    setError('');
    try {
      await onSelect(id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function create(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const workspace = await api<Workspace>('/workspaces', { method: 'POST', body: company });
      onCreatingChange(false);
      setCompany({ name: '', taxId: '', address: '', email: '' });
      setRevision((n) => n + 1);
      await onSelect(workspace.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <section className="panel" aria-label="Empresa" aria-busy={busy}>
        <PanelHeading title="Empresa" />
        {loadError && <ErrorBox>{loadError}</ErrorBox>}
        {error && !creating && <ErrorBox>{error}</ErrorBox>}
        {loading ? (
          <Loading />
        ) : (
          <div className="workspace-list" aria-label="Empresas disponibles">
            {data?.map((workspace) => (
              <button
                type="button"
                key={workspace.id}
                className="workspace-option"
                disabled={busy}
                aria-current={workspace.id === currentId ? 'true' : undefined}
                onClick={() => void select(workspace.id)}
              >
                <span className="workspace-option-icon">
                  <Store size={19} aria-hidden="true" />
                </span>
                <span>
                  <strong>{workspace.name.replace(' · DEMO', '')}</strong>
                  <small>
                    {workspace.id === currentId ? 'Empresa actual' : labels[workspace.role]}
                  </small>
                </span>
                {workspace.id === currentId && <Check size={18} aria-hidden="true" />}
              </button>
            ))}
          </div>
        )}
        {loadError && (
          <button className="button" disabled={busy} onClick={() => setRevision((n) => n + 1)}>
            Reintentar
          </button>
        )}
      </section>
      {creating && (
        <Modal
          title="Añadir empresa"
          wide
          onClose={() => {
            if (!busy) {
              onCreatingChange(false);
              setError('');
            }
          }}
        >
          {error && <ErrorBox>{error}</ErrorBox>}
          <form onSubmit={create}>
            <div className="form-grid">
              <Field label="Nombre de la empresa">
                <input
                  autoFocus
                  required
                  minLength={2}
                  maxLength={160}
                  value={company.name}
                  onChange={(e) => setCompany({ ...company, name: e.target.value })}
                  disabled={busy}
                />
              </Field>
              <Field label="NIF / identificador fiscal">
                <input
                  required
                  minLength={3}
                  maxLength={30}
                  value={company.taxId}
                  onChange={(e) => setCompany({ ...company, taxId: e.target.value })}
                  disabled={busy}
                />
              </Field>
              <Field label="Dirección fiscal">
                <input
                  required
                  minLength={3}
                  maxLength={300}
                  value={company.address}
                  onChange={(e) => setCompany({ ...company, address: e.target.value })}
                  disabled={busy}
                />
              </Field>
              <Field label="Correo electrónico (opcional)">
                <input
                  type="email"
                  value={company.email}
                  onChange={(e) => setCompany({ ...company, email: e.target.value })}
                  disabled={busy}
                />
              </Field>
            </div>
            <div className="modal-actions">
              <Submit busy={busy}>Crear empresa y entrar</Submit>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
