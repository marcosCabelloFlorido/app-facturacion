import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  CreditCard,
  Download,
  Eye,
  Link2,
  LoaderCircle,
  Paperclip,
  Pause,
  Play,
  Plus,
  Save,
  Search,
  Send,
  SlidersHorizontal,
  Upload,
  X,
  type LucideIcon,
} from 'lucide-react';
import { ActionsMenu } from './ActionsMenu';
import { Field, Modal, PanelHeading } from './components';
import { SectionNavigation } from './SectionNavigation';
import { transitionContent, type NavigationDirection } from './navigation-motion';
import { SearchPanel, useSearchPanel } from './SearchPanel';
import { Select } from './Select';
import { ToggleSwitch } from './ToggleSwitch';
import { createUploadProgress } from './upload-progress';
import {
  designAreas,
  featureAreasForSurface,
  featureDesigns,
  featuresForSurface,
  type DesignField,
  type FeatureDesign,
} from './feature-designs';
import { featureIcon } from './feature-icons';
import './feature-designs.css';

function actionIcon(label: string): LucideIcon {
  if (/^(Ver|Revisar|Consultar|Comparar|Comprobar|Buscar|Simular|Analizar)/.test(label)) return Eye;
  if (/^(Descargar|Exportar)/.test(label)) return Download;
  if (/^(Importar|Cargar)/.test(label)) return Upload;
  if (/^(Guardar)/.test(label)) return Save;
  if (/^(Pausar|Desactivar|Revocar)/.test(label)) return Pause;
  if (/^(Reanudar|Activar)/.test(label)) return Play;
  if (/^(Enviar|Solicitar|Invitar)/.test(label)) return Send;
  if (/^(Relacionar|Conectar|Asignar)/.test(label)) return Link2;
  if (/^(Crear|Añadir|Registrar|Abrir)/.test(label)) return Plus;
  return ArrowRight;
}

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const displayValue = (value: string) =>
  value
    .replace(/\s*·\s*ejemplo\b/gi, '')
    .replace(/\s+de ejemplo\b/gi, '')
    .replace(/^Ejemplo\s*/i, '')
    .replace(/^En diseño$/i, 'Sin configurar')
    .replace(/\s{2,}/g, ' ')
    .trim();

function FeatureModalSearch({
  title,
  placement = 'header',
  value = '',
  onApply,
}: {
  title: string;
  placement?: 'header' | 'mobile';
  value?: string;
  onApply?: (value: string) => void;
}) {
  const { open, closing, openSearch, closeSearch } = useSearchPanel();
  const [query, setQuery] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const label = `Buscar en ${title}`;

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => input.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const show = () => {
    setQuery(value);
    openSearch();
  };
  const dismiss = () => closeSearch();

  return (
    <>
      <button
        type="button"
        className={`feature-design-search-trigger feature-design-search-trigger-${placement}`}
        aria-label={label}
        title={value ? `${label} · ${value}` : label}
        data-active={Boolean(value) || undefined}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={show}
      >
        <Search size={18} strokeWidth={1.6} aria-hidden="true" />
        <span>Buscar</span>
      </button>
      {open && (
        <SearchPanel title={label} closing={closing} onClose={dismiss}>
          <form
            className="command-search"
            onSubmit={(event) => {
              event.preventDefault();
              if (!closing) closeSearch(() => onApply?.(query.trim()));
            }}
          >
            <div role="search" className="search-field">
              <Search size={18} aria-hidden="true" />
              <input
                ref={input}
                aria-label={label}
                placeholder={onApply ? 'Nombre o acción' : 'Buscar…'}
                enterKeyHint="search"
                autoComplete="off"
                maxLength={150}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            {value && onApply && (
              <div className="command-results">
                <button
                  type="button"
                  disabled={closing}
                  onClick={() => closeSearch(() => onApply(''))}
                >
                  <span>Quitar búsqueda</span>
                </button>
              </div>
            )}
          </form>
        </SearchPanel>
      )}
    </>
  );
}

export function FeatureDesigns({
  area,
  initialId,
  onClose,
  directoryActions = [],
}: {
  area: string;
  initialId?: string;
  onClose: () => void;
  /** Real operations supplied by the current record; never simulated design actions. */
  directoryActions?: { id: string; title: string; icon: LucideIcon; onAction: () => void }[];
}) {
  const [query, setQuery] = useState('');
  const [featureId, setFeatureId] = useState(initialId || '');
  const [action, setAction] = useState('');
  const focusTarget = useRef<HTMLDivElement>(null);
  const actionTrigger = useRef<HTMLButtonElement>(null);
  const originId = useRef(initialId || '');
  const feature = featureDesigns.find((item) => item.id === featureId);
  const surfaceAreas = featureAreasForSurface(area);
  const surfaceFeatures = featuresForSurface(area);
  const areaLabel = designAreas.find((item) => item.value === area)?.label || 'Funciones';
  const matches = surfaceFeatures.filter((item) =>
    normalize(
      item.title +
        ' ' +
        item.fields.map((field) => field.label).join(' ') +
        ' ' +
        item.actions.join(' '),
    ).includes(normalize(query.trim())),
  );

  const matchingActions = directoryActions.filter((item) =>
    normalize(item.title).includes(normalize(query.trim())),
  );
  const matchCount = matches.length + matchingActions.length;

  const focusBody = () =>
    requestAnimationFrame(() => {
      focusTarget.current?.closest('dialog')?.scrollTo({ top: 0 });
      focusTarget.current?.focus({ preventScroll: true });
    });

  const changeScreen = (update: () => void, direction: NavigationDirection) =>
    transitionContent(update, { target: () => focusTarget.current, direction, scope: 'section' });

  function openFeature(id: string) {
    changeScreen(() => {
      originId.current = id;
      setFeatureId(id);
      setAction('');
      focusBody();
    }, 'forward');
  }

  function back() {
    if (action) {
      changeScreen(() => {
        setAction('');
        requestAnimationFrame(() => actionTrigger.current?.focus({ preventScroll: true }));
      }, 'back');
      return;
    }
    changeScreen(() => {
      setFeatureId('');
      requestAnimationFrame(() => {
        const target = focusTarget.current?.querySelector<HTMLButtonElement>(
          `[data-design-id="${CSS.escape(originId.current)}"]`,
        );
        (target || focusTarget.current)?.focus({ preventScroll: true });
      });
    }, 'back');
  }

  return (
    <Modal
      title={action || feature?.title || areaLabel}
      onClose={onClose}
      wide
      className="feature-design-modal"
      headerLeading={
        feature ? (
          <button
            type="button"
            className="icon-button"
            onClick={back}
            aria-label={action ? 'Volver a la función' : `Volver a ${areaLabel.toLowerCase()}`}
          >
            <ArrowLeft size={20} />
          </button>
        ) : undefined
      }
      headerActions={
        feature && !action ? (
          <ActionsMenu
            items={feature.actions.map((label) => ({
              label,
              icon: actionIcon(label),
              onAction: () => {
                changeScreen(() => {
                  setAction(label);
                  focusBody();
                }, 'forward');
              },
            }))}
            label={`Acciones de ${feature.title}`}
            triggerRef={actionTrigger}
          />
        ) : !feature ? (
          <FeatureModalSearch title={areaLabel} value={query} onApply={setQuery} />
        ) : undefined
      }
    >
      <div ref={focusTarget} tabIndex={-1} className="feature-design-body">
        {feature ? (
          <DesignWorkspace key={feature.id} feature={feature} action={action} onBack={back} />
        ) : (
          <>
            <div className="feature-design-mobile-tools">
              <FeatureModalSearch
                title={areaLabel}
                placement="mobile"
                value={query}
                onApply={setQuery}
              />
            </div>
            <p className="feature-design-count" role="status">
              {matchCount} {matchCount === 1 ? 'función' : 'funciones'}
            </p>
            {designAreas.map((group) => {
              if (!surfaceAreas.includes(group.value)) return null;
              const items = matches.filter((item) => item.area === group.value);
              const liveActions = group.value === area ? matchingActions : [];
              if (!items.length && !liveActions.length) return null;
              return (
                <section
                  className="feature-design-group"
                  key={group.value}
                  aria-label={group.label}
                >
                  {surfaceAreas.length > 1 && <PanelHeading title={group.label} />}
                  <div className="feature-design-directory">
                    {liveActions.map(({ id, title, icon: Icon, onAction }) => (
                      <button
                        key={id}
                        type="button"
                        className="feature-design-link"
                        data-directory-action={id}
                        onClick={onAction}
                      >
                        <Icon size={18} strokeWidth={1.6} aria-hidden="true" />
                        <span>{title}</span>
                        <ChevronRight size={16} aria-hidden="true" />
                      </button>
                    ))}
                    {items.map((item) => {
                      const Icon = featureIcon(item);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          className="feature-design-link"
                          data-design-id={item.id}
                          onClick={() => openFeature(item.id)}
                        >
                          <Icon size={18} strokeWidth={1.6} aria-hidden="true" />
                          <span>{item.title}</span>
                          <ChevronRight size={16} aria-hidden="true" />
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
            {!matchCount && <p className="feature-design-empty">No hay coincidencias.</p>}
          </>
        )}
      </div>
    </Modal>
  );
}

function DesignWorkspace({
  feature,
  action,
  onBack,
}: {
  feature: FeatureDesign;
  action: string;
  onBack: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      feature.fields.map((field) => [field.label, displayValue(field.value || '')]),
    ),
  );
  const [view, setView] = useState('details');
  const [rowId, setRowId] = useState<number | null>(null);
  const main = useRef<HTMLDivElement>(null);
  const showRow = (id: number | null) =>
    transitionContent(() => setRowId(id), {
      target: () => main.current,
      direction: id === null ? 'back' : 'forward',
      scope: 'section',
    });
  const [rows, setRows] = useState(() =>
    feature.rows.map((row) => row.map((cell) => displayValue(cell))),
  );
  const [selectedRows, setSelectedRows] = useState<number[]>([]);

  const form = (
    <div className="form-grid feature-design-fields">
      {feature.fields.map((field) => (
        <DraftField
          key={field.label}
          field={field}
          value={values[field.label]}
          onChange={(value) => setValues((old) => ({ ...old, [field.label]: value }))}
        />
      ))}
    </div>
  );

  const table = (
    <DraftTable
      feature={feature}
      rows={rows}
      selected={selectedRows}
      onSelect={(index) =>
        setSelectedRows((old) =>
          old.includes(index) ? old.filter((item) => item !== index) : [...old, index],
        )
      }
      onDetail={showRow}
    />
  );

  if (action) {
    const ActionIcon = actionIcon(action);
    return (
      <section
        className="feature-design-confirm"
        aria-label={action}
        data-feature-design={feature.id}
      >
        <PanelHeading title={feature.title} />
        <dl className="feature-design-summary">
          {feature.fields
            .filter((field) => field.type !== 'file')
            .map((field) => (
              <div key={field.label}>
                <dt>{displayValue(field.label)}</dt>
                <dd>
                  {field.type === 'toggle'
                    ? values[field.label] === 'true'
                      ? 'Sí'
                      : 'No'
                    : values[field.label] || '—'}
                </dd>
              </div>
            ))}
        </dl>
        <div className="modal-actions">
          <button type="button" className="button" onClick={onBack}>
            Volver
          </button>
          <button type="button" className="button primary" disabled>
            <ActionIcon size={16} aria-hidden="true" />
            {action}
          </button>
        </div>
      </section>
    );
  }

  return (
    <div data-feature-design={feature.id} className="feature-design-workspace">
      <SectionNavigation
        label="Secciones"
        value={view}
        onChange={(value) => {
          setView(value);
          setRowId(null);
        }}
        items={[
          { value: 'details', label: 'Datos' },
          { value: 'preview', label: 'Vista previa' },
          { value: 'history', label: 'Historial' },
        ]}
      />
      <div ref={main} className="feature-design-main">
        {rowId !== null ? (
          <section>
            <PanelHeading
              title="Detalle"
              action={
                <button
                  className="icon-button"
                  type="button"
                  aria-label="Volver a la tabla"
                  onClick={() => showRow(null)}
                >
                  <ArrowLeft size={18} />
                </button>
              }
            />
            <div className="form-grid feature-design-fields">
              {feature.columns.map((label, column) => (
                <Field key={label} label={displayValue(label)}>
                  <input
                    value={rows[rowId][column]}
                    onChange={(event) =>
                      setRows((old) =>
                        old.map((row, index) =>
                          index === rowId
                            ? row.map((cell, cellIndex) =>
                                cellIndex === column ? event.target.value : cell,
                              )
                            : row,
                        ),
                      )
                    }
                  />
                </Field>
              ))}
            </div>
          </section>
        ) : view === 'history' ? (
          <FeatureHistory />
        ) : view === 'preview' ? (
          <section>
            <PanelHeading title="Vista previa" />
            {feature.layout === 'permissions' ? (
              <PermissionPreview />
            ) : feature.layout === 'document' ? (
              <div className="feature-design-paper">
                <span className="feature-design-status">Borrador</span>
                <h2>{feature.title}</h2>
                <dl className="feature-design-summary">
                  {feature.fields.slice(0, 4).map((field) => (
                    <div key={field.label}>
                      <dt>{displayValue(field.label)}</dt>
                      <dd>{values[field.label] || '—'}</dd>
                    </div>
                  ))}
                </dl>
                {table}
              </div>
            ) : (
              table
            )}
          </section>
        ) : (
          <>
            <PanelHeading
              title={
                feature.layout === 'reconcile'
                  ? 'Selección y criterios'
                  : feature.layout === 'mapping'
                    ? 'Origen y revisión'
                    : 'Datos'
              }
            />
            {form}
            <section className="feature-design-records" aria-label="Registros">
              <PanelHeading
                title={
                  feature.layout === 'reconcile'
                    ? 'Elementos para relacionar'
                    : feature.layout === 'mapping'
                      ? 'Revisión de datos'
                      : feature.layout === 'report'
                        ? 'Resultado'
                        : 'Registros'
                }
              />
              {feature.layout === 'permissions' ? <PermissionPreview /> : table}
              {feature.layout === 'reconcile' && (
                <div className="feature-design-match">
                  <CreditCard size={18} aria-hidden="true" />
                  <strong>Correspondencia propuesta</strong>
                  <span>{selectedRows.length} seleccionados</span>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function FeatureHistory() {
  return (
    <div className="document-activity feature-design-history">
      <section aria-label="Historial">
        <PanelHeading title="Historial" />
        <ul className="document-history" aria-label="Eventos">
          <li className="document-history-row">
            <strong>Configuración creada</strong>
            <span className="document-history-meta">
              <span>Equipo de trabajo</span>
              <time>Ahora</time>
            </span>
          </li>
        </ul>
      </section>
    </div>
  );
}

function DraftField({
  field,
  value,
  onChange,
}: {
  field: DesignField;
  value: string;
  onChange: (value: string) => void;
}) {
  const label = displayValue(field.label);
  if (field.type === 'file')
    return (
      <div className="field">
        <span className="field-label">{label}</span>
        <DraftFileField label={label} value={value} onChange={onChange} />
      </div>
    );
  if (field.type === 'toggle')
    return (
      <div className="feature-design-switch">
        <span>{label}</span>
        <ToggleSwitch
          checked={value === 'true'}
          label={label}
          onChange={(checked) => onChange(String(checked))}
        />
      </div>
    );
  return (
    <Field label={label} className={field.type === 'textarea' ? 'span-2' : ''}>
      {field.type === 'select' ? (
        <Select value={value} onChange={(event) => onChange(event.target.value)}>
          {field.options!.map((option) => {
            const visibleOption = displayValue(option);
            return (
              <option key={option} value={visibleOption}>
                {visibleOption}
              </option>
            );
          })}
        </Select>
      ) : field.type === 'textarea' ? (
        <textarea rows={2} value={value} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input
          type={field.type}
          step={field.type === 'number' ? 'any' : undefined}
          value={value}
          autoComplete="off"
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </Field>
  );
}

type DraftUpload = {
  filename: string;
  size: number | null;
  progress: number;
  status: 'uploading' | 'complete';
};

function DraftFileField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [upload, setUpload] = useState<DraftUpload | null>(() =>
    value ? { filename: value, size: null, progress: 100, status: 'complete' } : null,
  );
  const presentation = useRef<ReturnType<typeof createUploadProgress> | null>(null);
  const completionTimer = useRef<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(
    () => () => {
      if (completionTimer.current !== null) window.clearTimeout(completionTimer.current);
      presentation.current?.stop();
      presentation.current = null;
    },
    [],
  );

  const selectFile = (file?: File) => {
    if (!file) return;
    if (completionTimer.current !== null) window.clearTimeout(completionTimer.current);
    presentation.current?.stop();
    setUpload({ filename: file.name, size: file.size, progress: 0, status: 'uploading' });
    onChange(file.name);
    const animation = createUploadProgress((progress) =>
      setUpload((current) =>
        current?.filename === file.name
          ? {
              ...current,
              progress,
            }
          : current,
      ),
    );
    presentation.current = animation;
    completionTimer.current = window.setTimeout(() => {
      completionTimer.current = null;
      void animation.complete().finally(() => {
        if (presentation.current !== animation) return;
        presentation.current = null;
        setUpload((current) => (current ? { ...current, status: 'complete' } : null));
      });
    }, 450);
  };

  const removeFile = () => {
    if (completionTimer.current !== null) window.clearTimeout(completionTimer.current);
    completionTimer.current = null;
    presentation.current?.stop();
    presentation.current = null;
    setUpload(null);
    onChange('');
    requestAnimationFrame(() => fileInput.current?.focus({ preventScroll: true }));
  };

  return (
    <div className="feature-design-file">
      <div
        className={`feature-design-file-picker${upload ? ' has-upload' : ''}`}
        data-upload-status={upload?.status}
      >
        {upload?.status === 'complete' ? (
          <>
            <span className="feature-design-file-name">{upload.filename}</span>
            <button
              type="button"
              className="icon-button icon-button-plain feature-design-file-remove"
              aria-label={`Eliminar ${upload.filename}`}
              onClick={removeFile}
            >
              <X size={16} aria-hidden="true" />
            </button>
          </>
        ) : (
          <>
            <span className="feature-design-file-icon">
              {upload?.status === 'uploading' ? (
                <LoaderCircle className="spin" size={16} aria-hidden="true" />
              ) : (
                <Paperclip size={17} aria-hidden="true" />
              )}
            </span>
            <span className="feature-design-file-content">
              <span className="feature-design-file-title">
                <span>{upload?.filename || 'Seleccionar archivo'}</span>
                {upload && <span className="feature-design-file-percent">{upload.progress} %</span>}
              </span>
              {upload && (
                <>
                  <span className="feature-design-file-meta">
                    {upload.size === null
                      ? ''
                      : `${Math.max(1, Math.ceil(upload.size / 1024))} KB · `}
                    Adjuntando…
                  </span>
                  <progress
                    className="feature-design-file-progress"
                    max={100}
                    value={upload.progress}
                    aria-label={`Adjuntar ${upload.filename}`}
                    aria-valuetext={`${upload.progress} %`}
                  />
                </>
              )}
            </span>
            <input
              ref={fileInput}
              type="file"
              aria-label={label}
              onChange={(event) => {
                selectFile(event.target.files?.[0]);
                event.target.value = '';
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}

const numericCell = (value: string) => /€| USD| GBP|^[−-]?\d[\d.,]*\s*%?$/.test(value);

function DraftTable({
  feature,
  rows,
  selected,
  onSelect,
  onDetail,
}: {
  feature: FeatureDesign;
  rows: string[][];
  selected: number[];
  onSelect: (index: number) => void;
  onDetail: (index: number) => void;
}) {
  return (
    <div
      className="table-scroll feature-design-table-scroll"
      role="region"
      aria-label={feature.title}
      tabIndex={0}
    >
      <table className="feature-design-table">
        <thead>
          <tr>
            <th scope="col" className="feature-design-selection-cell">
              <span className="sr-only">Selección</span>
            </th>
            {feature.columns.map((label, column) => (
              <th
                key={label}
                scope="col"
                className={rows.some((row) => numericCell(row[column])) ? 'numeric' : undefined}
              >
                {displayValue(label)}
              </th>
            ))}
            <th scope="col" className="table-actions-cell">
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className={selected.includes(index) ? 'is-selected' : ''}>
              <td className="feature-design-selection-cell">
                <label className="feature-design-checkbox">
                  <input
                    type="checkbox"
                    aria-label={'Seleccionar ' + row[0]}
                    checked={selected.includes(index)}
                    onChange={() => onSelect(index)}
                  />
                </label>
              </td>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className={numericCell(cell) ? 'numeric' : undefined}>
                  {/^\d{2}\/\d{2}\/\d{4}$/.test(cell) ? (
                    <span className="feature-design-date">{cell}</span>
                  ) : cellIndex === 0 ? (
                    <span className="table-name">{cell}</span>
                  ) : (
                    cell
                  )}
                </td>
              ))}
              <td className="table-actions-cell">
                <ActionsMenu
                  label={'Acciones de ' + row[0]}
                  items={[
                    {
                      label: 'Ver o editar',
                      icon: SlidersHorizontal,
                      onAction: () => onDetail(index),
                    },
                  ]}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PermissionPreview() {
  const [access, setAccess] = useState([
    'Documentos:Consultar',
    'Documentos:Preparar',
    'Pagos:Consultar',
  ]);
  return (
    <div
      className="table-scroll feature-design-table-scroll"
      role="region"
      aria-label="Permisos"
      tabIndex={0}
    >
      <table className="feature-design-table">
        <thead>
          <tr>
            <th scope="col">Operación</th>
            {['Consultar', 'Preparar', 'Aprobar'].map((label) => (
              <th key={label} scope="col">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {['Documentos', 'Pagos', 'Configuración'].map((operation) => (
            <tr key={operation}>
              <th scope="row">
                <span className="table-name">{operation}</span>
              </th>
              {['Consultar', 'Preparar', 'Aprobar'].map((permission) => {
                const key = operation + ':' + permission;
                return (
                  <td key={permission}>
                    <label className="feature-design-checkbox">
                      <input
                        type="checkbox"
                        aria-label={permission + ' · ' + operation}
                        checked={access.includes(key)}
                        onChange={(event) =>
                          setAccess((old) =>
                            event.target.checked
                              ? [...old, key]
                              : old.filter((item) => item !== key),
                          )
                        }
                      />
                    </label>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
