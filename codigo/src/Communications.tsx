import { CreationSteps } from './CreationSteps';
import { useEffect, useRef, useState } from 'react';
import { SectionEmpty } from './SectionEmpty';
import {
  Plus,
  ArrowLeft,
  ArrowRight,
  FileText,
  Check,
  Eye,
  Link2Off,
  RotateCcw,
  Link as LinkIcon,
  Download,
  Settings2,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { Button as ActionButton, Tooltip, TooltipTrigger } from 'react-aria-components';
import { api, downloadUrl, shortDate } from './api';
import { Field, ErrorBox, Loading, PanelHeading, Modal, useRemote } from './components';
import { Select } from './Select';
import { ActionsMenu } from './ActionsMenu';
import { uploadFile } from './Files';
import { defaultTemplate, type DocumentTemplate, type TemplateSettings } from '../shared/templates';
import type { FinancialDocument } from '../shared/domain';
import { labels } from '../shared/domain';
import { previewPdf } from './communication-download';
import { DocumentPreview } from './DocumentPreview';
import './communications.css';
import './creation.css';
const messageLabels: Record<string, string> = {
  draft: 'Preparado',
  queued: 'Pendiente de envío',
  sending: 'Enviando',
  sent: 'Aceptado por SMTP',
  failed: 'No enviado',
  uncertain: 'Resultado por comprobar',
  cancelled: 'Cancelado',
};
type Notify = (message: string) => void;
type Message = {
  id: string;
  recipient: string;
  subject: string;
  body?: string;
  status: string;
  version: number;
  error?: string;
  attempts: number;
  sent_at?: string;
  history?: { state: string; created_at: string }[];
};
export function TemplatesSettings({
  notify,
  readonly,
  creating,
  onCreatingChange,
  onHasItemsChange,
}: {
  notify: Notify;
  readonly: boolean;
  creating: boolean;
  onCreatingChange: (creating: boolean) => void;
  onHasItemsChange?: (hasItems: boolean) => void;
}) {
  const [revision, setRevision] = useState(0),
    [editing, setEditing] = useState<DocumentTemplate | null | undefined>(),
    [deletingTemplateId, setDeletingTemplateId] = useState(''),
    [deletedTemplateId, setDeletedTemplateId] = useState(''),
    [error, setError] = useState('');
  const { data, loading, error: loadError } = useRemote<DocumentTemplate[]>('/templates', revision);
  useEffect(() => {
    onHasItemsChange?.(!loadError && !!data?.length);
    return () => onHasItemsChange?.(false);
  }, [data, loadError, onHasItemsChange]);
  useEffect(() => {
    if (
      !deletedTemplateId ||
      loading ||
      data?.some((template) => template.id === deletedTemplateId)
    )
      return;
    requestAnimationFrame(() => {
      const target =
        document.querySelector<HTMLElement>('.communications-panel .actions-trigger') ||
        document.querySelector<HTMLElement>('.page-heading .actions-trigger');
      target?.focus();
    });
    setDeletedTemplateId('');
  }, [data, deletedTemplateId, loading]);
  const closeEditor = () => {
    setEditing(undefined);
    onCreatingChange(false);
  };
  const refresh = () => {
    closeEditor();
    setRevision((v) => v + 1);
    notify('Plantilla guardada.');
  };
  return (
    <section className="panel communications-panel">
      <PanelHeading title="Plantillas de documentos" />
      {(error || loadError) && <ErrorBox>{error || loadError}</ErrorBox>}
      {loading ? (
        <Loading />
      ) : loadError ? null : !data?.length ? (
        <SectionEmpty
          icon={<FileText size={24} strokeWidth={1.5} aria-hidden="true" />}
          message="No hay plantillas personalizadas"
          action={
            !readonly && (
              <button type="button" className="button" onClick={() => onCreatingChange(true)}>
                Crear plantilla
              </button>
            )
          }
        />
      ) : (
        <div className="communication-list">
          {data.map((t) => (
            <div className="communication-row" key={t.id}>
              <div>
                <strong>{t.name}</strong>
                <p className="muted">
                  {labels[t.kind]} · Versión {t.version} ·{' '}
                  {t.active ? 'Predeterminada' : 'Disponible'}
                </p>
              </div>
              <ActionsMenu
                label={'Acciones de ' + t.name}
                items={[
                  {
                    label: readonly ? 'Ver plantilla' : 'Editar plantilla',
                    icon: readonly ? Eye : Settings2,
                    onAction: () => setEditing(t),
                  },
                  !readonly && {
                    label: t.active ? 'Usar diseño original' : 'Usar como predeterminada',
                    icon: t.active ? RotateCcw : Check,
                    onAction: async () => {
                      try {
                        await api('/templates/' + t.id + '/activate', {
                          method: 'POST',
                          body: { version: t.version, active: !t.active },
                        });
                        setRevision((v) => v + 1);
                        notify('Plantilla predeterminada actualizada.');
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    },
                  },
                  !readonly && {
                    label: 'Eliminar plantilla',
                    icon: Trash2,
                    disabled: !!deletingTemplateId,
                    onAction: async () => {
                      if (deletingTemplateId) return;
                      setDeletingTemplateId(t.id);
                      setError('');
                      try {
                        await api('/templates/' + t.id, {
                          method: 'DELETE',
                          body: { version: t.version },
                        });
                        setDeletedTemplateId(t.id);
                        setRevision((value) => value + 1);
                      } catch (cause) {
                        setError((cause as Error).message);
                      } finally {
                        setDeletingTemplateId('');
                      }
                    },
                  },
                ]}
              />
            </div>
          ))}
        </div>
      )}
      {(creating || editing !== undefined) && (
        <TemplateEditor
          value={editing ?? null}
          readonly={readonly}
          onClose={closeEditor}
          onSaved={refresh}
        />
      )}
    </section>
  );
}
function TemplateEditor({
  value,
  readonly,
  onClose,
  onSaved,
}: {
  value: DocumentTemplate | null;
  readonly: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(value?.name || ''),
    [kind, setKind] = useState<DocumentTemplate['kind']>(value?.kind || 'invoice'),
    [settings, setSettings] = useState<TemplateSettings>(value?.settings || defaultTemplate),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [preview, setPreview] = useState(''),
    [documentId, setDocumentId] = useState('');
  const wizard = !value && !readonly;
  const [step, setStep] = useState(0);
  const [availableStep, setAvailableStep] = useState(0);
  const form = useRef<HTMLFormElement>(null);
  const saving = useRef(false);
  const stepBody = useRef<HTMLDivElement>(null);
  const go = (next: number) => {
    if (busy) return;
    if (next > step && (!form.current?.reportValidity() || name.trim().length < 2)) {
      if (name.trim().length < 2) setError('Escribe un nombre de al menos 2 caracteres.');
      return;
    }
    setError('');
    setStep(next);
    setAvailableStep((previous) => Math.max(previous, next));
    requestAnimationFrame(() => stepBody.current?.focus({ preventScroll: true }));
  };
  const { data: documents } = useRemote<{ rows: FinancialDocument[] }>('/documents?kind=' + kind);
  const { data: versions } = useRemote<{ version: number; data: DocumentTemplate }[]>(
    value ? '/templates/' + value.id + '/versions' : '/templates',
  );
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  const previewButton = useRef<HTMLButtonElement>(null);
  const closePreview = () => {
    setPreview('');
    requestAnimationFrame(() => previewButton.current?.focus({ preventScroll: true }));
  };
  const change = (key: keyof TemplateSettings, v: unknown) =>
    setSettings((s) => ({ ...s, [key]: v }));
  return (
    <Modal
      title={value ? 'Plantilla: ' + value.name : 'Nueva plantilla'}
      wide
      className={`template-editor-dialog creation-dialog editor-page${wizard ? ' template-wizard' : ''}`}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form
        ref={form}
        className="communication-form creation-form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy || readonly || saving.current) return;
          if (wizard && step < 2) {
            go(step + 1);
            return;
          }
          if (name.trim().length < 2) {
            setError('Escribe un nombre de al menos 2 caracteres.');
            if (wizard) setStep(0);
            return;
          }
          saving.current = true;
          setBusy(true);
          setError('');
          try {
            await api('/templates' + (value ? '/' + value.id : ''), {
              method: value ? 'PUT' : 'POST',
              body: { name, kind, settings, ...(value ? { version: value.version } : {}) },
            });
            onSaved();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            saving.current = false;
            setBusy(false);
          }
        }}
      >
        {wizard && (
          <CreationSteps
            names={['Datos', 'Diseño', 'Revisar']}
            step={step}
            availableStep={availableStep}
            disabled={busy}
            onChange={go}
            label="Pasos de la plantilla"
          />
        )}
        {error && <ErrorBox>{error}</ErrorBox>}
        <div ref={stepBody} tabIndex={-1} className="template-step-content creation-content">
          <fieldset disabled={busy || readonly}>
            <div className="form-grid">
              {(!wizard || step === 0) && (
                <>
                  <Field label="Nombre">
                    <input
                      required
                      minLength={2}
                      maxLength={100}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </Field>
                  <Field label="Tipo de documento">
                    <Select
                      value={kind}
                      disabled={!!value}
                      onChange={(e) => {
                        setKind(e.target.value as typeof kind);
                        setDocumentId('');
                      }}
                    >
                      {(['invoice', 'quote', 'purchase', 'credit'] as const).map((k) => (
                        <option key={k} value={k}>
                          {labels[k]}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Idioma del PDF">
                    <Select
                      value={settings.language}
                      onChange={(e) => change('language', e.target.value)}
                    >
                      <option value="es">Español</option>
                      <option value="en">Inglés</option>
                    </Select>
                  </Field>
                </>
              )}
              {(!wizard || step === 1) && (
                <>
                  <Field label="Espaciado">
                    <Select
                      value={settings.density}
                      onChange={(e) => change('density', e.target.value)}
                    >
                      <option value="comfortable">Cómodo</option>
                      <option value="compact">Compacto</option>
                    </Select>
                  </Field>
                  <Field label="Color del PDF">
                    <Select
                      value={settings.accent}
                      onChange={(e) => change('accent', e.target.value)}
                    >
                      <option value="#171717">Negro</option>
                      <option value="#334155">Gris pizarra</option>
                      <option value="#1e40af">Azul</option>
                    </Select>
                  </Field>
                  <Field label="Logotipo" hint="PNG o JPEG, hasta 2 MB y 2000 × 2000 px.">
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setBusy(true);
                        setError('');
                        try {
                          if (file.size > 2 * 1024 * 1024) throw Error('El logo supera 2 MB.');
                          const uploaded = await uploadFile(file);
                          change('logoFileId', uploaded.id);
                        } catch (e) {
                          setError((e as Error).message);
                        } finally {
                          setBusy(false);
                        }
                      }}
                    />
                    {settings.logoFileId && (
                      <button
                        type="button"
                        className="quiet-link"
                        onClick={() => change('logoFileId', null)}
                      >
                        Quitar logotipo
                      </button>
                    )}
                  </Field>
                  <Field label="Texto al pie" className="span-2">
                    <textarea
                      aria-label="Texto al pie"
                      rows={3}
                      maxLength={500}
                      value={settings.footer}
                      onChange={(e) => change('footer', e.target.value)}
                    />
                  </Field>
                </>
              )}
            </div>
          </fieldset>
          {wizard && step === 2 && (
            <dl className="template-review">
              <div>
                <dt>Nombre</dt>
                <dd>{name}</dd>
              </div>
              <div>
                <dt>Tipo de documento</dt>
                <dd>{labels[kind]}</dd>
              </div>
              <div>
                <dt>Idioma</dt>
                <dd>{settings.language === 'es' ? 'Español' : 'Inglés'}</dd>
              </div>
              <div>
                <dt>Espaciado</dt>
                <dd>{settings.density === 'compact' ? 'Compacto' : 'Cómodo'}</dd>
              </div>
              <div>
                <dt>Color</dt>
                <dd>
                  {settings.accent === '#171717'
                    ? 'Negro'
                    : settings.accent === '#334155'
                      ? 'Gris pizarra'
                      : 'Azul'}
                </dd>
              </div>
              <div>
                <dt>Logotipo</dt>
                <dd>{settings.logoFileId ? 'Añadido' : 'Sin logotipo'}</dd>
              </div>
              {settings.footer && (
                <div className="template-review-footer">
                  <dt>Texto al pie</dt>
                  <dd>{settings.footer}</dd>
                </div>
              )}
            </dl>
          )}
          {value && versions && (
            <details className="optional-details">
              <summary>Versiones anteriores</summary>
              {versions
                .filter((v) => v.data)
                .map((v) => (
                  <p key={v.version}>
                    Versión {v.version} · {v.data.name}
                    {!readonly && v.version !== value.version && (
                      <button
                        className="quiet-link"
                        type="button"
                        onClick={() => {
                          setName(v.data.name);
                          setSettings(v.data.settings);
                        }}
                      >
                        Cargar para revisar
                      </button>
                    )}
                  </p>
                ))}
            </details>
          )}
          {!readonly && (!wizard || step === 2) && (
            <div className="communication-preview-controls">
              <Field label="Documento para vista previa">
                <Select value={documentId} onChange={(e) => setDocumentId(e.target.value)}>
                  <option value="">Seleccionar documento</option>
                  {documents?.rows.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.number || 'Borrador'} · {d.party.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <button
                type="button"
                className="button"
                ref={previewButton}
                disabled={busy || !documentId || name.trim().length < 2}
                onClick={async () => {
                  setBusy(true);
                  setError('');
                  try {
                    setPreview(
                      await previewPdf('/templates/preview', { name, kind, settings, documentId }),
                    );
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Ver PDF de prueba
              </button>
            </div>
          )}
        </div>
        {wizard ? (
          <div className="template-wizard-actions wizard-actions">
            {step > 0 && (
              <button
                type="button"
                className="icon-button icon-button-plain"
                aria-label="Anterior"
                title="Anterior"
                disabled={busy}
                onClick={() => go(step - 1)}
              >
                <ArrowLeft size={16} aria-hidden="true" />
              </button>
            )}
            <button type="submit" className="button primary" disabled={busy}>
              {busy ? 'Procesando…' : step < 2 ? 'Continuar' : 'Guardar plantilla'}
              {step < 2 ? (
                <ArrowRight size={16} aria-hidden="true" />
              ) : (
                <Check size={16} aria-hidden="true" />
              )}
            </button>
          </div>
        ) : (
          <div className="modal-actions">
            <button type="button" className="button" disabled={busy} onClick={onClose}>
              Cerrar
            </button>
            {!readonly && (
              <button className="button primary" disabled={busy}>
                {busy ? 'Guardando…' : 'Guardar plantilla'}
              </button>
            )}
          </div>
        )}{' '}
      </form>
      {preview && (
        <DocumentPreview url={preview} title={'Vista previa · ' + name} onClose={closePreview} />
      )}
    </Modal>
  );
}
type MailState = { ready: boolean };
export function PortalSettings({ notify }: { notify: Notify }) {
  const [revision, setRevision] = useState(0),
    [value, setValue] = useState<string | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const state = useRemote<{ baseUrl: string; version: number }>('/portal/settings', revision);
  if (state.loading) return <Loading />;
  return (
    <section className="panel communications-panel">
      <PanelHeading title="Portal del cliente" />
      {(error || state.error) && <ErrorBox>{error || state.error}</ErrorBox>}
      <form
        className="communication-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError('');
          try {
            await api('/portal/settings', {
              method: 'PUT',
              body: {
                baseUrl: value ?? state.data?.baseUrl ?? '',
                version: state.data?.version || 0,
              },
            });
            setValue(null);
            setRevision((v) => v + 1);
            notify('Dirección del portal guardada.');
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="Dirección pública (opcional)">
          <input
            type="url"
            value={value ?? state.data?.baseUrl ?? ''}
            placeholder="https://facturas.tuempresa.es"
            onChange={(e) => setValue(e.target.value)}
          />
        </Field>
        <div className="form-footer">
          <button className="button primary" disabled={busy}>
            Guardar dirección
          </button>
        </div>
      </form>
    </section>
  );
}

type Share = {
  id: string;
  recipient: string;
  allow_sign: boolean;
  expires_at: string;
  revoked_at: string | null;
  accesses: number;
  receipt?: { decision: string; signer_name: string; created_at: string } | null;
};
export function DocumentDeliveryModal({
  doc,
  readonly,
  mode,
  onClose,
  notify,
}: {
  doc: FinancialDocument;
  readonly: boolean;
  mode: 'mail' | 'portal';
  onClose: () => void;
  notify: Notify;
}) {
  const [revision, setRevision] = useState(0),
    [error, setError] = useState(''),
    [message, setMessage] = useState<Message | null | undefined>(),
    [shareOpen, setShareOpen] = useState(false),
    [deletingId, setDeletingId] = useState<string | null>(null),
    [link, setLink] = useState('');
  const messages = useRemote<Message[]>('/documents/' + doc.id + '/messages', revision);
  const shares = useRemote<Share[]>('/documents/' + doc.id + '/shares', revision);
  const createShareButton = useRef<HTMLButtonElement>(null);
  const createMessageButton = useRef<HTMLButtonElement>(null);
  const deletingMessage = useRef(false);
  const removeMessage = async (m: Message) => {
    if (deletingMessage.current) return;
    deletingMessage.current = true;
    setDeletingId(m.id);
    setError('');
    try {
      await api('/messages/' + m.id, { method: 'DELETE', body: { version: m.version } });
      messages.setData((current) => current?.filter((item) => item.id !== m.id) ?? null);
      setRevision((v) => v + 1);
      createMessageButton.current?.focus();
    } catch (e) {
      setError((e as Error).message);
      setRevision((v) => v + 1);
    } finally {
      deletingMessage.current = false;
      setDeletingId(null);
    }
  };
  const activeShares = (shares.data || []).filter(
    (share) => !share.revoked_at && new Date(share.expires_at).getTime() > Date.now(),
  );
  const mail = useRemote<MailState>('/mail/settings', revision);
  useEffect(() => {
    if (!messages.data?.some((m) => ['queued', 'sending'].includes(m.status))) return;
    const timer = setInterval(() => setRevision((v) => v + 1), 5000);
    return () => clearInterval(timer);
  }, [messages.data]);
  const refresh = () => {
    setRevision((v) => v + 1);
    setMessage(undefined);
    setShareOpen(false);
  };
  const openLink = async (s: Share) => {
    setError('');
    try {
      const result = await api<{ path: string; url: string | null }>('/shares/' + s.id + '/link');
      setLink(result.url || location.origin + result.path);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <Modal
      title={mode === 'mail' ? 'Correo' : 'Portal del cliente'}
      className="document-delivery-modal"
      wide
      onClose={onClose}
      headerActions={
        mode === 'mail' && !readonly ? (
          <TooltipTrigger delay={400}>
            <ActionButton
              ref={createMessageButton}
              className="icon-button icon-button-plain"
              aria-label="Preparar correo"
              onPress={() => setMessage(null)}
            >
              <Plus size={18} strokeWidth={1.6} aria-hidden="true" />
            </ActionButton>
            <Tooltip className="ui-tooltip" placement="bottom">
              Preparar correo
            </Tooltip>
          </TooltipTrigger>
        ) : undefined
      }
    >
      <div className="communication-stack document-delivery">
        {(error || messages.error || shares.error || mail.error) && (
          <ErrorBox>{error || messages.error || shares.error || mail.error}</ErrorBox>
        )}
        {mode === 'mail' ? (
          <div className="document-mail-content">
            <div>
              {!messages.loading && !messages.error && !messages.data?.length && (
                <p className="muted">Sin correos.</p>
              )}
              {messages.loading && !messages.data ? (
                <Loading compact />
              ) : !messages.data?.length ? null : (
                <div className="communication-list">
                  {messages.data.map((m) => (
                    <div className="communication-row communication-message-row" key={m.id}>
                      <div>
                        <strong>{m.subject}</strong>
                        <p>{m.recipient}</p>
                        <p className="muted" role="status">
                          {deletingId === m.id ? 'Eliminando…' : messageLabels[m.status]}
                          {m.sent_at ? ' · ' + shortDate(m.sent_at) : ''}
                        </p>
                        {m.error && <p>{m.error}</p>}
                      </div>
                      <ActionsMenu
                        label={'Acciones del mensaje: ' + m.subject}
                        items={[
                          {
                            label: 'Ver mensaje',
                            icon: Eye,
                            onAction: async () => {
                              try {
                                setMessage(await api<Message>('/messages/' + m.id));
                              } catch (e) {
                                setError((e as Error).message);
                              }
                            },
                          },
                          !readonly && {
                            label: 'Eliminar mensaje',
                            icon: Trash2,
                            disabled: deletingId !== null || m.status === 'sending',
                            title:
                              m.status === 'queued'
                                ? 'Cancela también el envío pendiente'
                                : undefined,
                            onAction: () => removeMessage(m),
                          },
                        ]}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Enlaces vigentes y creación conservan sus acciones. */}
            {shares.loading && !shares.data ? (
              <Loading compact />
            ) : !activeShares.length ? (
              !shares.error && <p className="muted">Comparte el documento con un enlace privado.</p>
            ) : (
              <div className="communication-list">
                {activeShares.map((s) => (
                  <div className="communication-row" key={s.id}>
                    <div>
                      <strong>{s.recipient}</strong>
                      <p className="muted">
                        Válido hasta {shortDate(s.expires_at)} · {s.accesses} accesos
                      </p>
                      {s.receipt && (
                        <p>
                          {s.receipt.decision === 'accept' ? 'Aceptado' : 'Rechazado'} por{' '}
                          {s.receipt.signer_name}
                        </p>
                      )}
                    </div>
                    <ActionsMenu
                      label={'Acciones del enlace de ' + s.recipient}
                      items={[
                        {
                          label: 'Ver enlace',
                          icon: ExternalLink,
                          onAction: () => openLink(s),
                        },
                        !readonly && {
                          label: 'Revocar enlace',
                          icon: Link2Off,
                          onAction: async () => {
                            try {
                              await api('/shares/' + s.id + '/revoke', {
                                method: 'POST',
                                body: {},
                              });
                              shares.setData(
                                (current) => current?.filter((share) => share.id !== s.id) ?? null,
                              );
                              setLink('');
                              refresh();
                              notify('Enlace revocado.');
                              requestAnimationFrame(() => createShareButton.current?.focus());
                            } catch (e) {
                              setError((e as Error).message);
                            }
                          },
                        },
                      ]}
                    />
                  </div>
                ))}
              </div>
            )}
            {!readonly && (
              <div className="communication-inline-actions">
                <TooltipTrigger delay={400}>
                  <ActionButton
                    className="icon-button icon-button-plain"
                    ref={createShareButton}
                    aria-label="Crear enlace"
                    onPress={() => setShareOpen(true)}
                  >
                    <LinkIcon size={18} aria-hidden="true" />
                  </ActionButton>
                  <Tooltip className="ui-tooltip" placement="bottom">
                    Crear enlace
                  </Tooltip>
                </TooltipTrigger>
              </div>
            )}
          </>
        )}
      </div>
      {message !== undefined && (
        <MessageEditor
          doc={doc}
          value={message}
          ready={!!mail.data?.ready}
          readonly={readonly}
          onClose={() => setMessage(undefined)}
          onSaved={refresh}
          notify={notify}
        />
      )}
      {shareOpen && (
        <ShareEditor
          doc={doc}
          onClose={() => setShareOpen(false)}
          onSaved={async (id) => {
            refresh();
            const result = await api<{ path: string; url: string | null }>(
              '/shares/' + id + '/link',
            );
            setLink(result.url || location.origin + result.path);
            notify('Enlace creado. No se ha enviado ningún correo.');
          }}
        />
      )}
      {link && (
        <Modal title="Enlace del documento" onClose={() => setLink('')}>
          <div className="communication-form">
            <Field label="Enlace privado">
              <input readOnly value={link} onFocus={(e) => e.target.select()} />
            </Field>
            <p>
              Cualquier persona con este enlace puede consultar el documento y los adjuntos elegidos
              hasta su caducidad o revocación.
            </p>
            {['localhost', '127.0.0.1', '[::1]'].includes(new URL(link).hostname) && (
              <p>Este enlace solo funciona en este ordenador.</p>
            )}
            <div className="modal-actions">
              <button
                className="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(link);
                    notify('Enlace copiado.');
                  } catch {
                    setError('Selecciona el enlace y cópialo con el teclado.');
                  }
                }}
              >
                Copiar enlace
              </button>
              <a className="button primary" href={link} target="_blank" rel="noreferrer">
                Abrir portal
              </a>
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  );
}

function MessageEditor({
  doc,
  value,
  ready,
  readonly,
  onClose,
  onSaved,
  notify,
}: {
  doc: FinancialDocument;
  value: Message | null;
  ready: boolean;
  readonly: boolean;
  onClose: () => void;
  onSaved: () => void;
  notify: Notify;
}) {
  const [recipient, setRecipient] = useState(value?.recipient || doc.party.email || ''),
    [subject, setSubject] = useState(value?.subject || labels[doc.kind] + ' ' + doc.number),
    [body, setBody] = useState(value?.body || 'Adjuntamos el documento ' + doc.number + '.'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [uncertain, setUncertain] = useState(false);
  const editable = !readonly && (!value || ['draft', 'failed', 'cancelled'].includes(value.status));
  const dirty =
    !value || recipient !== value.recipient || subject !== value.subject || body !== value.body;
  return (
    <Modal
      title="Correo del documento"
      wide
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form
        className="communication-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError('');
          try {
            await api(value ? '/messages/' + value.id : '/documents/' + doc.id + '/messages', {
              method: value ? 'PUT' : 'POST',
              body: { recipient, subject, body, ...(value ? { version: value.version } : {}) },
            });
            notify('Correo preparado con el PDF archivado.');
            onSaved();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {error && <ErrorBox>{error}</ErrorBox>}
        <fieldset disabled={!editable || busy}>
          <Field label="Destinatario">
            <input
              type="email"
              required
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
          </Field>
          <Field label="Asunto">
            <input
              required
              maxLength={200}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </Field>
          <Field label="Mensaje">
            <textarea
              required
              rows={7}
              maxLength={20000}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </Field>
        </fieldset>
        <p>Adjunto: PDF definitivo de {doc.number}.</p>
        {value && (
          <p role="status">
            {messageLabels[value.status]}
            {value.error ? ' · ' + value.error : ''}
          </p>
        )}
        {value?.status === 'sent' && (
          <p>El servidor SMTP lo ha aceptado; este estado no confirma entrega ni lectura.</p>
        )}
        {value?.status === 'uncertain' && !readonly && (
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={uncertain}
              onChange={(e) => setUncertain(e.target.checked)}
            />
            He comprobado el resultado y autorizo otro intento, aunque podría duplicar el envío.
          </label>
        )}
        {value?.history?.length ? (
          <details className="optional-details">
            <summary>Historial de envío</summary>
            {value.history.map((h, i) => (
              <p key={i}>
                {messageLabels[h.state] || h.state} ·{' '}
                {new Date(h.created_at).toLocaleString('es-ES')}
              </p>
            ))}
          </details>
        ) : null}
        <div className="modal-actions">
          <button type="button" className="button" disabled={busy} onClick={onClose}>
            Cerrar
          </button>
          {editable && (
            <button className="button" disabled={busy || !dirty}>
              Guardar mensaje
            </button>
          )}
          {value && !dirty && (
            <a className="button" href={downloadUrl('/messages/' + value.id + '/eml')}>
              <Download size={16} />
              Descargar correo
            </a>
          )}
          {value &&
            !readonly &&
            !dirty &&
            ['draft', 'failed', 'cancelled', 'uncertain'].includes(value.status) && (
              <button
                type="button"
                className="button primary"
                disabled={busy || !ready || (value.status === 'uncertain' && !uncertain)}
                onClick={async () => {
                  setBusy(true);
                  setError('');
                  try {
                    await api('/messages/' + value.id + '/queue', {
                      method: 'POST',
                      body: { version: value.version, acknowledgeUncertain: uncertain },
                    });
                    notify('Correo autorizado. Se enviará desde la cola.');
                    onSaved();
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Enviar a {recipient}
              </button>
            )}
          {value?.status === 'queued' && !readonly && (
            <button
              type="button"
              className="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await api('/messages/' + value.id + '/cancel', {
                    method: 'POST',
                    body: { version: value.version },
                  });
                  notify('Envío cancelado.');
                  onSaved();
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Cancelar envío pendiente
            </button>
          )}
        </div>
        {value && !ready && !readonly && (
          <p>El envío de correo aún no está disponible. Puedes descargar el mensaje.</p>
        )}
      </form>
    </Modal>
  );
}
function ShareEditor({
  doc,
  onClose,
  onSaved,
}: {
  doc: FinancialDocument;
  onClose: () => void;
  onSaved: (id: string) => Promise<void>;
}) {
  const [recipient, setRecipient] = useState(doc.party.email || ''),
    [days, setDays] = useState(30),
    [sign, setSign] = useState(doc.kind === 'quote'),
    [ids, setIds] = useState<string[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const files = useRemote<{ id: string; filename: string }[]>('/documents/' + doc.id + '/files');
  return (
    <Modal
      title="Compartir documento"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form
        className="communication-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError('');
          try {
            const result = await api<{ id: string }>('/documents/' + doc.id + '/shares', {
              method: 'POST',
              body: { recipient, expiresInDays: days, allowSign: sign, fileIds: ids },
            });
            await onSaved(result.id);
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {(error || files.error) && <ErrorBox>{error || files.error}</ErrorBox>}
        <Field label="Destinatario del enlace">
          <input
            type="email"
            required
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
          />
        </Field>
        <Field label="Caduca dentro de (días)">
          <input
            type="number"
            min={1}
            max={90}
            required
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          />
        </Field>
        {doc.kind === 'quote' && (
          <label className="checkbox-row">
            <input type="checkbox" checked={sign} onChange={(e) => setSign(e.target.checked)} />
            Permitir aceptar o rechazar el presupuesto.
          </label>
        )}
        {!!files.data?.length && (
          <fieldset>
            <legend>Adjuntos que podrá descargar</legend>
            {files.data.map((f) => (
              <label className="checkbox-row" key={f.id}>
                <input
                  type="checkbox"
                  checked={ids.includes(f.id)}
                  onChange={(e) =>
                    setIds(e.target.checked ? [...ids, f.id] : ids.filter((id) => id !== f.id))
                  }
                />
                {f.filename}
              </label>
            ))}
          </fieldset>
        )}
        <p>El PDF se comparte siempre. Crear el enlace no envía mensajes.</p>
        <div className="modal-actions">
          <button className="button primary" disabled={busy || !!files.error}>
            Crear enlace
          </button>
        </div>
      </form>
    </Modal>
  );
}
