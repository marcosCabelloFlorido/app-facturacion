import { openTableRow } from './row-navigation';
import { Select } from './Select';
import { contactDetailHref } from './contact-route';
import { useEffect, useState } from 'react';
import { ContactPicker } from './ContactPicker';
import { api, euros, tableDate, today } from './api';
import {
  Field,
  Modal,
  Submit,
  ErrorBox,
  Loading,
  PanelHeading,
  Empty,
  useRemote,
  type Notify,
} from './components';
import type { FinancialDocument } from '../shared/domain';
type Fund = {
  id: string;
  direction: string;
  party: { name: string; taxId: string; address: string; email: string };
  amount: string;
  available: string;
  date: string;
  reference: string;
};
export function Funds({
  readonly,
  notify,
  onChange,
  creating,
  onCloseCreate,
  filter = '',
}: {
  readonly: boolean;
  notify: Notify;
  onChange: () => void;
  creating: boolean;
  onCloseCreate: () => void;
  filter?: string;
}) {
  const [revision, setRevision] = useState(0),
    [selected, setSelected] = useState<Fund | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const {
    data,
    loading,
    error: loadError,
  } = useRemote<Fund[]>('/funds?search=' + encodeURIComponent(filter), revision);
  useEffect(() => {
    if (creating) setError('');
  }, [creating]);
  const [form, setForm] = useState({
    direction: 'receipt',
    date: today(),
    method: 'bank',
    reference: '',
    amount: '',
    party: { name: '', taxId: '', address: '', email: '' },
  });
  const [allocation, setAllocation] = useState({ date: today(), amount: '', documentId: '' });
  const [partyError, setPartyError] = useState('');
  const [search, setSearch] = useState(''),
    [page, setPage] = useState(1);
  const { data: documents } = useRemote<{ rows: FinancialDocument[]; count: number }>(
    '/documents?status=unpaid&page=' + page + '&search=' + encodeURIComponent(search),
    revision,
  );
  const done = () => {
    setRevision((v) => v + 1);
    onCloseCreate();
    setSelected(null);
    onChange();
    notify('Anticipo y contabilidad actualizados.');
  };
  return (
    <section aria-label="Anticipos y fondos">
      {loadError ? (
        <ErrorBox>{loadError}</ErrorBox>
      ) : loading ? (
        <Loading />
      ) : !data?.length ? (
        <Empty
          showMessage={Boolean(filter)}
          title={filter ? 'No hay resultados' : 'Sin anticipos registrados'}
          description={filter ? 'Prueba con otro nombre, NIF o referencia.' : undefined}
        />
      ) : (
        <div className="table-scroll document-list-scroll">
          <table
            className="document-list document-list-balanced document-list-priced"
            aria-label="Anticipos y fondos"
          >
            <colgroup>
              <col className="document-column-identity" />
              <col className="document-column-party" />
              <col className="document-column-due" />
              <col className="document-column-status" />
              <col className="document-column-price" />
            </colgroup>
            <thead>
              <tr>
                <th>Referencia</th>
                <th>Cliente / proveedor</th>
                <th>Fecha</th>
                <th>Origen</th>
                <th className="numeric">Importe</th>
              </tr>
            </thead>
            <tbody>
              {data.map((f) => (
                <tr
                  key={f.id}
                  className={!readonly && Number(f.available) > 0 ? 'record-row' : undefined}
                  onClick={(event) => openTableRow(event, 'button.document-link')}
                >
                  <td className="doc-identity">
                    {!readonly && Number(f.available) > 0 ? (
                      <button
                        type="button"
                        className="text-link document-link"
                        aria-label={'Aplicar o devolver ' + f.reference + ' de ' + f.party.name}
                        onClick={() => {
                          setSelected(f);
                          setAllocation({
                            date: today() < f.date ? f.date : today(),
                            amount: f.available,
                            documentId: '',
                          });
                          setError('');
                          setSearch(f.party.taxId);
                          setPage(1);
                        }}
                      >
                        <strong>{f.reference || 'Anticipo'}</strong>
                      </button>
                    ) : (
                      <strong>{f.reference || 'Anticipo'}</strong>
                    )}
                  </td>
                  <td className="doc-party">
                    {contactDetailHref(f.party.taxId) ? (
                      <a
                        className="text-link table-name"
                        href={contactDetailHref(
                          f.party.taxId,
                          'payments?tab=funds' +
                            (filter ? '&search=' + encodeURIComponent(filter) : ''),
                        )}
                      >
                        {f.party.name}
                      </a>
                    ) : (
                      <span className="table-name">{f.party.name}</span>
                    )}
                  </td>
                  <td className="doc-due" data-label="Fecha">
                    <time dateTime={f.date}>{tableDate(f.date)}</time>
                  </td>
                  <td className="doc-status">
                    {f.direction === 'receipt' ? 'Recibido' : 'Entregado'}
                  </td>
                  <td className="numeric total-cell doc-price" data-label="Importe">
                    <span>{euros(f.amount)}</span>
                    <small className="document-list-balance">
                      Disponible <strong>{euros(f.available)}</strong>
                    </small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {creating && (
        <Modal
          title="Registrar anticipo"
          description="No emite una factura de anticipo fiscal."
          onClose={() => {
            if (!busy) onCloseCreate();
          }}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!form.party.name || !form.party.address) {
                setPartyError('Consulta el NIF y confirma o completa la ficha para continuar.');
                return;
              }
              setBusy(true);
              setError('');
              try {
                await api('/funds', { method: 'POST', body: form });
                done();
                setForm({ ...form, amount: '', reference: '' });
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {error && <ErrorBox>{error}</ErrorBox>}
            <ContactPicker
              party={form.party}
              type={form.direction === 'receipt' ? 'customer' : 'supplier'}
              disabled={busy}
              error={partyError}
              onSelect={(party) => {
                setForm((current) => ({ ...current, party }));
                setPartyError('');
              }}
            />
            <div className="form-grid">
              <Field label="Origen del anticipo">
                <Select
                  value={form.direction}
                  onChange={(e) => setForm({ ...form, direction: e.target.value })}
                >
                  <option value="receipt">Recibido del cliente</option>
                  <option value="payment">Entregado al proveedor</option>
                </Select>
              </Field>
              <Field label="Importe">
                <input
                  required
                  inputMode="decimal"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value.replace(',', '.') })}
                />
              </Field>
              <Field label="Fecha">
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </Field>
              <Field label="Medio">
                <Select
                  value={form.method}
                  onChange={(e) => setForm({ ...form, method: e.target.value })}
                >
                  <option value="bank">Transferencia</option>
                  <option value="cash">Efectivo</option>
                  <option value="card">Tarjeta</option>
                </Select>
              </Field>
            </div>
            <Field label="Referencia del movimiento">
              <input
                required
                minLength={3}
                value={form.reference}
                onChange={(e) => setForm({ ...form, reference: e.target.value })}
              />
            </Field>
            <div className="modal-actions">
              <Submit busy={busy}>Registrar anticipo</Submit>
            </div>
          </form>
        </Modal>
      )}
      {selected && (
        <Modal
          title="Aplicar o devolver fondos"
          description={`${selected.party.name} · Disponible ${euros(selected.available)}`}
          onClose={() => {
            if (!busy) setSelected(null);
          }}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError('');
              try {
                await api('/funds/' + selected.id + '/apply', {
                  method: 'POST',
                  body: { ...allocation, documentId: allocation.documentId || null },
                });
                done();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {error && <ErrorBox>{error}</ErrorBox>}
            <Field label="Buscar factura">
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </Field>
            <Field label="Destino">
              <Select
                value={allocation.documentId}
                onChange={(e) => setAllocation({ ...allocation, documentId: e.target.value })}
              >
                <option value="">Devolver fondos sin aplicar</option>
                {documents?.rows
                  .filter(
                    (d) => d.kind === (selected.direction === 'receipt' ? 'invoice' : 'purchase'),
                  )
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.number} · {d.party.name} · {euros(d.balance)}
                    </option>
                  ))}
              </Select>
            </Field>
            {documents && documents.count > 25 && (
              <div className="actions">
                <button
                  type="button"
                  className="button"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Anterior
                </button>
                <span>Página {page}</span>
                <button
                  type="button"
                  className="button"
                  disabled={page * 25 >= documents.count}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Siguiente
                </button>
              </div>
            )}
            <div className="form-grid">
              <Field label="Importe">
                <input
                  required
                  inputMode="decimal"
                  value={allocation.amount}
                  onChange={(e) =>
                    setAllocation({ ...allocation, amount: e.target.value.replace(',', '.') })
                  }
                />
              </Field>
              <Field label="Fecha">
                <input
                  type="date"
                  min={selected.date}
                  required
                  value={allocation.date}
                  onChange={(e) => setAllocation({ ...allocation, date: e.target.value })}
                />
              </Field>
            </div>
            <div className="modal-actions">
              <Submit busy={busy}>
                {allocation.documentId ? 'Aplicar a factura' : 'Registrar devolución'}
              </Submit>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
