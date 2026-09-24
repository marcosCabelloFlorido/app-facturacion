import { useContext, useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { SearchPanel, useSearchPanel } from './SearchPanel';
import { navigate } from './api';
import { FeatureDesignContext } from './feature-design-context';
import { designAreas, featuresForSurface } from './feature-designs';

type Command = { label: string; route: string; keywords: string; designId?: string };
export function navigationCommands(readonly: boolean, admin: boolean): Command[] {
  return [
    {
      label: 'Perfil',
      route: 'settings/profile',
      keywords: 'nombre foto avatar permisos contraseña seguridad',
    },
    ...(!readonly
      ? [
          { label: 'Nueva factura', route: 'new/invoice', keywords: 'crear emitir venta' },
          { label: 'Nuevo presupuesto', route: 'new/quote', keywords: 'crear propuesta oferta' },
          { label: 'Nueva compra', route: 'new/purchase', keywords: 'registrar gasto proveedor' },
        ]
      : []),
    { label: 'Visión general', route: 'overview', keywords: 'inicio resumen indicadores kpi' },
    { label: 'Facturas de venta', route: 'sales', keywords: 'clientes ingresos documentos' },
    { label: 'Presupuestos', route: 'quotes', keywords: 'propuestas ofertas' },
    { label: 'Compras y gastos', route: 'purchases', keywords: 'facturas proveedores' },
    { label: 'Pendiente de cobro', route: 'sales?metric=pending', keywords: 'saldos de clientes' },
    {
      label: 'Presupuestos pendientes',
      route: 'overview/quotes',
      keywords: 'propuestas ofertas pendientes de respuesta',
    },
    { label: 'Pendiente de pago', route: 'overview/payable', keywords: 'saldos de proveedores' },
    { label: 'Vencimientos pendientes', route: 'payments', keywords: 'cobrar pagar plazos' },
    {
      label: 'Movimientos registrados',
      route: 'payments?tab=history',
      keywords: 'cobros pagos historial tesoreria',
    },
    {
      label: 'Anticipos y fondos',
      route: 'payments?tab=funds',
      keywords: 'saldo cuenta remanente',
    },
    { label: 'Clientes y proveedores', route: 'contacts', keywords: 'contactos lista fichas' },
    { label: 'Catálogo', route: 'catalog', keywords: 'productos servicios articulos precios' },
    {
      label: 'Evolución y actividad',
      route: 'overview/analysis',
      keywords: 'analisis graficos ingresos gastos',
    },
    {
      label: 'Contabilidad',
      route: 'accounting',
      keywords: 'diario asientos cuentas informes impuestos periodos',
    },
    {
      label: 'Configuración',
      route: 'settings',
      keywords: 'empresa usuarios seguridad series preferencias',
    },
    {
      label: 'Empresa',
      route: 'settings/workspaces',
      keywords: 'configuracion cambiar empresa negocio espacio',
    },
    {
      label: 'Importaciones',
      route: 'settings/imports',
      keywords: 'configuracion cargar csv excel archivo lote',
    },
    ...(admin
      ? [{ label: 'Registro de auditoría', route: 'audit', keywords: 'historial cambios' }]
      : []),
  ];
}
const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
export function findCommands(commands: Command[], query: string) {
  const words = normalize(query).trim().split(/\s+/);
  return commands.filter((c) =>
    words.every((word) => normalize(c.label + ' ' + c.keywords).includes(word)),
  );
}
export function openCommandSearch() {
  window.dispatchEvent(new Event('app:command-search'));
}
export function CommandSearchTrigger() {
  return (
    <button
      type="button"
      className="command-trigger"
      aria-label="Buscar acciones y secciones"
      title="Buscar acciones y secciones"
      aria-haspopup="dialog"
      onClick={openCommandSearch}
    >
      <Search size={16} aria-hidden="true" />
      <span>Buscar</span>
    </button>
  );
}
export function CommandSearch({
  readonly,
  admin,
  hideTrigger = false,
}: {
  readonly: boolean;
  admin: boolean;
  hideTrigger?: boolean;
}) {
  const { open, closing, openSearch, closeSearch } = useSearchPanel();
  useEffect(() => {
    const launch = () => {
      setQuery('');
      openSearch();
    };
    window.addEventListener('app:command-search', launch);
    return () => window.removeEventListener('app:command-search', launch);
  }, [openSearch]);
  const [query, setQuery] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const results = useRef<HTMLDivElement>(null);
  const designs = useContext(FeatureDesignContext);
  const featureArea = designAreas.find((area) => area.value === designs?.area)?.label || 'módulo';
  const scopedFeatures = designs ? featuresForSurface(designs.area) : [];
  const commands = findCommands(
    [
      ...navigationCommands(readonly, admin),
      ...(designs
        ? [
            {
              label: `Más funciones de ${featureArea.toLowerCase()}`,
              route: 'designs',
              designId: '*',
              keywords: 'funciones opciones herramientas',
            },
          ]
        : []),
      ...(designs && query.trim()
        ? scopedFeatures.map((feature) => ({
            label: feature.title,
            route: 'designs/' + feature.id,
            designId: feature.id,
            keywords: feature.fields.map((f) => f.label).join(' '),
          }))
        : []),
    ],
    query,
  );
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => input.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (
        (event.ctrlKey || event.metaKey) &&
        !event.altKey &&
        !event.shiftKey &&
        event.key.toLowerCase() === 'k'
      ) {
        // Leave an active form/dialog in charge of its own keyboard interaction.
        if (
          !open &&
          document.querySelector(
            'dialog[open], [role="dialog"]:not(#app-navigation):not([aria-hidden="true"]):not([inert])',
          )
        )
          return;
        event.preventDefault();
        if (open) closeSearch();
        else {
          setQuery('');
          openSearch();
        }
      }
    };
    window.addEventListener('keydown', listener, true);
    return () => window.removeEventListener('keydown', listener, true);
  }, [open, openSearch, closeSearch]);
  const choose = (command: Command) => {
    if (closing) return;
    closeSearch(() =>
      command.designId && designs
        ? designs.open(command.designId === '*' ? undefined : command.designId)
        : navigate(command.route),
    );
  };
  return (
    <>
      {!hideTrigger && (
        <button
          type="button"
          className="command-trigger"
          aria-label="Buscar acciones y secciones"
          title="Buscar acciones y secciones"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => {
            setQuery('');
            openSearch();
          }}
        >
          <Search size={16} aria-hidden="true" />
          <span>Buscar</span>
        </button>
      )}
      {open && (
        <SearchPanel title="¿Qué quieres hacer?" onClose={closeSearch} closing={closing}>
          <div className="command-search">
            <div role="search" className="search-field">
              <Search size={18} aria-hidden="true" />
              <input
                ref={input}
                aria-label="Buscar acciones y secciones"
                placeholder="Buscar una acción o un apartado…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    results.current?.querySelector<HTMLButtonElement>('button')?.focus();
                  }
                  if (e.key === 'Enter' && commands.length === 1) {
                    e.preventDefault();
                    choose(commands[0]);
                  }
                }}
              />
            </div>
            <p className="sr-only" role="status">
              {commands.length} resultados. Usa flecha abajo para recorrerlos y Enter para abrir.
            </p>
            <div className="command-results" ref={results}>
              {commands.map((command) => (
                <button
                  key={command.route}
                  type="button"
                  onClick={() => choose(command)}
                  onKeyDown={(e) => {
                    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
                    e.preventDefault();
                    const buttons = Array.from(
                      results.current?.querySelectorAll<HTMLButtonElement>('button') || [],
                    );
                    const index =
                      buttons.indexOf(e.currentTarget) + (e.key === 'ArrowDown' ? 1 : -1);
                    if (index < 0) input.current?.focus();
                    else buttons[Math.min(index, buttons.length - 1)]?.focus();
                  }}
                >
                  <span>{command.label}</span>
                </button>
              ))}
              {!commands.length && (
                <p className="muted">
                  No hay coincidencias. Prueba «factura», «cobro» o «catálogo».
                </p>
              )}
            </div>
          </div>
        </SearchPanel>
      )}
    </>
  );
}
