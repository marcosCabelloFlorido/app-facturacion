import { Select } from './Select';
import { useState } from 'react';
import { Check, LoaderCircle, Pencil, X } from 'lucide-react';
import { api } from './api';
import { labels, type User } from '../shared/domain';
import { ErrorBox, Field, Modal, Loading, useRemote } from './components';
type Member = User & { active: boolean; version: number };
export function AccessMembers({
  revision: external = 0,
  onRefresh,
}: {
  revision?: number;
  onRefresh: () => void;
}) {
  const [revision, setRevision] = useState(0),
    [member, setMember] = useState<Member | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const { data, error: loadError, loading } = useRemote<Member[]>('/users', revision + external);
  return (
    <>
      {loadError && <ErrorBox>{loadError}</ErrorBox>}
      {loading ? (
        <Loading />
      ) : (
        <div className="table-scroll">
          <table className="members-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Permiso</th>
                <th>Acceso</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data?.map((u) => (
                <tr key={u.id}>
                  <td>
                    <strong>{u.name}</strong>
                  </td>
                  <td>{u.email}</td>
                  <td>{labels[u.role]}</td>
                  <td>{u.active ? 'Activo' : 'Desactivado'}</td>
                  <td>
                    <button
                      type="button"
                      className="icon-button icon-button-plain"
                      aria-label={`Modificar acceso de ${u.name}`}
                      title="Modificar acceso"
                      onClick={() => {
                        setError('');
                        setMember({ ...u });
                      }}
                    >
                      <Pencil size={16} strokeWidth={1.6} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {member && (
        <Modal
          title="Permisos del negocio"
          description={member.name}
          className="access-permissions-modal"
          onClose={() => {
            if (!busy) setMember(null);
          }}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError('');
              try {
                await api('/users/' + member.id + '/access', {
                  method: 'PUT',
                  body: { version: member.version, role: member.role, active: member.active },
                });
                setMember(null);
                setRevision((v) => v + 1);
                onRefresh();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {error && <ErrorBox>{error}</ErrorBox>}
            <Field label="Permiso">
              <Select
                value={member.role}
                onChange={(e) => setMember({ ...member, role: e.target.value as User['role'] })}
              >
                <option value="viewer">Consulta</option>
                <option value="operator">Gestor</option>
                <option value="admin">Administrador</option>
              </Select>
            </Field>
            <Field label="Acceso">
              <Select
                value={String(member.active)}
                onChange={(e) => setMember({ ...member, active: e.target.value === 'true' })}
              >
                <option value="true">Activo</option>
                <option value="false">Desactivado</option>
              </Select>
            </Field>
            <div className="modal-actions access-permissions-actions">
              <button
                type="submit"
                className="icon-button icon-button-plain access-permissions-confirm"
                disabled={busy}
                aria-label={busy ? 'Guardando permisos' : 'Guardar permisos'}
                title={busy ? 'Guardando permisos' : 'Guardar permisos'}
              >
                {busy ? (
                  <LoaderCircle className="spin" size={20} aria-hidden="true" />
                ) : (
                  <Check size={20} strokeWidth={1.6} aria-hidden="true" />
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
