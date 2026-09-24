import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import {
  cancelNavigationMotion,
  navigationEntryIndex,
  routeDirection,
  transitionContent,
} from './navigation-motion';

import {
  BookOpen,
  Boxes,
  FileCheck2,
  FileText,
  House,
  Receipt,
  Wallet,
  Users,
  X,
  Check,
} from 'lucide-react';
import type { Company, User } from '../shared/domain';
import { Sidebar } from './Sidebar';
import { FeatureDesignContext } from './feature-design-context';
import { FeatureDesigns } from './FeatureDesigns';
import { areaForRoute, featureDesigns } from './feature-designs';
import { Contacts } from './Contacts';
import { api, navigate, canNavigate, setActiveWorkspace } from './api';
import { ErrorBox, Loading, ModuleHeaderContext, type NoticeAction } from './components';
import { Auth } from './Auth';
import {
  OverviewAnalysis,
  Documents,
  Payments,
  Catalog,
  Accounting,
  Settings,
  Audit,
} from './pages';
import { Dashboard, DashboardDetail } from './Dashboard';
import { isDashboardMetric } from '../shared/dashboard';
import { CommandSearch, CommandSearchTrigger, openCommandSearch } from './CommandSearch';
import { DocumentEditor, DocumentDetail } from './documents';
import './page-shell.css';
import './accounting.css';
import './due-dates.css';
import './focus.css';
type Me = { user: User; company: Company; demo: boolean; workspaceId: string };
const navigation = [
  {
    section: 'GESTIÓN',
    items: [
      { id: 'overview', label: 'Visión general', icon: House },
      { id: 'sales', label: 'Facturas de venta', icon: FileText },
      { id: 'quotes', label: 'Presupuestos', icon: FileCheck2 },
      { id: 'purchases', label: 'Compras y gastos', icon: Receipt },
      { id: 'payments', label: 'Cobros y pagos', icon: Wallet },
      { id: 'contacts', label: 'Clientes y proveedores', icon: Users },
      { id: 'catalog', label: 'Catálogo', icon: Boxes },
    ],
  },
  {
    section: 'ANÁLISIS',
    items: [{ id: 'accounting', label: 'Contabilidad', icon: BookOpen }],
  },
];
export function App({ embedded = false }: { embedded?: boolean }) {
  const [route, setRoute] = useState(location.hash.slice(1) || 'overview');
  const [me, setMe] = useState<Me | null>(null);
  const [setup, setSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fatal, setFatal] = useState('');
  const [mobile, setMobile] = useState(false);
  const [narrow, setNarrow] = useState(() => matchMedia('(max-width:760px)').matches);
  const [sidebarHidden, setSidebarHidden] = useState(true);
  const [toast, setToast] = useState<{ message: string; action?: NoticeAction } | null>(null);
  const [documentSection, setDocumentSection] = useState('');
  const documentSectionRef = useRef('');
  documentSectionRef.current = documentSection;
  const [designDraft, setDesignDraft] = useState<{ area: string; id?: string } | null>(null);
  useEffect(() => setDesignDraft(null), [route, me?.workspaceId]);
  const [switching, setSwitching] = useState(false);
  const bootstrap = useCallback(async () => {
    setLoading(true);
    setFatal('');
    try {
      const state = await api<{ needsSetup: boolean }>('/auth/status');
      setSetup(state.needsSetup);
      if (!state.needsSetup) {
        try {
          let profile: Me;
          try {
            profile = await api<Me>('/me');
          } catch (error) {
            if (![400, 403].includes((error as { status: number }).status)) throw error;
            setActiveWorkspace(null);
            profile = await api<Me>('/me');
          }
          setActiveWorkspace(profile.workspaceId);
          setMe(profile);
        } catch (e) {
          if ((e as { status: number }).status !== 401) throw e;
          setActiveWorkspace(null);
          setMe(null);
        }
      }
    } catch (e) {
      setFatal((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void bootstrap();
    let currentRoute = location.hash.slice(1) || 'overview';
    let currentIndex = navigationEntryIndex();
    const handler = () => {
      const nextRoute = location.hash.slice(1) || 'overview';
      if (nextRoute === currentRoute) return;
      if (!canNavigate()) {
        history.replaceState(null, '', '#' + currentRoute);
        return;
      }
      const nextIndex = navigationEntryIndex();
      const direction = routeDirection(currentRoute, nextRoute, {
        previousIndex: currentIndex,
        nextIndex,
        backLink:
          document.activeElement?.closest('.module-back-link')?.getAttribute('href') ===
          '#' + nextRoute,
      });
      const mainSection = (value: string) => {
        const root = value.split(/[/?]/)[0];
        return root === 'settings' || root === 'audit'
          ? 'settings'
          : areaForRoute(value, documentSectionRef.current);
      };
      const nextRoot = nextRoute.split(/[/?]/)[0];
      const mainSectionChange =
        [...navigation.flatMap((group) => group.items.map((item) => item.id)), 'settings'].includes(
          nextRoot,
        ) && mainSection(currentRoute) !== mainSection(nextRoute);
      const settingsSection =
        currentRoute.startsWith('settings') && nextRoute.startsWith('settings');
      const openingContactDirectory =
        nextRoute.split('?')[0] === 'contacts' &&
        new URLSearchParams(nextRoute.split('?')[1]).get('directory') === '1';
      currentRoute = nextRoute;
      currentIndex = nextIndex;
      const mobileMenuWasOpen =
        matchMedia('(max-width:760px)').matches &&
        document.querySelector('.compact-sidebar.is-open') !== null;
      transitionContent(
        () => {
          setRoute(nextRoute);
          setMobile(false);
          if (mobileMenuWasOpen) {
            requestAnimationFrame(() => document.getElementById('main-content')?.focus());
          }
          window.scrollTo(0, 0);
        },
        {
          direction,
          mainSectionChange,
          scope: settingsSection ? 'section' : 'page',
          target: () =>
            // A page snapshot can cover the directory's top-layer backdrop.
            openingContactDirectory
              ? null
              : document.querySelector(settingsSection ? '.settings-main' : '#main-content'),
        },
      );
    };
    const expired = () => {
      cancelNavigationMotion();
      setActiveWorkspace(null);
      setMe(null);
    };
    window.addEventListener('hashchange', handler);
    window.addEventListener('session-expired', expired);
    return () => {
      cancelNavigationMotion();
      window.removeEventListener('hashchange', handler);
      window.removeEventListener('session-expired', expired);
    };
  }, [bootstrap]);
  useEffect(() => {
    const media = matchMedia('(max-width:760px)');
    const resize = () => {
      setNarrow(media.matches);
      setMobile(false);
    };
    media.addEventListener('change', resize);
    return () => media.removeEventListener('change', resize);
  }, []);
  useEffect(() => {
    if (!toast || toast.action) return;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    const [page, id] = route.split('?')[0].split('/');
    setDocumentSection('');
    if (!['document', 'edit'].includes(page) || !id || !me) return;
    const controller = new AbortController();
    api<{ kind: string }>('/documents/' + id, { signal: controller.signal })
      .then((d) => {
        setDocumentSection(
          d.kind === 'quote' ? 'quotes' : d.kind === 'purchase' ? 'purchases' : 'sales',
        );
      })
      .catch(() => {});
    return () => controller.abort();
  }, [route, me]);
  if (loading) return <Loading />;
  if (fatal)
    return (
      <div className="connection-error">
        <ErrorBox>{fatal}</ErrorBox>
        <button className="button" onClick={bootstrap}>
          Reintentar conexión
        </button>
      </div>
    );
  if (!me) return <Auth setup={setup} onSuccess={bootstrap} />;
  const [page, id] = route.split('?')[0].split('/');
  const readonly = me.user.role === 'viewer';
  const current =
    page === 'new'
      ? id === 'quote'
        ? 'quotes'
        : id === 'purchase'
          ? 'purchases'
          : 'sales'
      : ['document', 'edit'].includes(page)
        ? documentSection
        : page === 'imports'
          ? 'settings'
          : page;
  const notify = (message: string, action?: NoticeAction) => setToast({ message, action });
  const common = { notify, readonly, userId: me.user.id, workspaceId: me.workspaceId };
  let content;
  switch (page) {
    case 'overview':
      content = isDashboardMetric(id) ? (
        <DashboardDetail key={route} metric={id} />
      ) : id === 'analysis' ? (
        <OverviewAnalysis {...common} name={me.user.name} />
      ) : (
        <Dashboard {...common} name={me.user.name} />
      );
      break;
    case 'sales':
    case 'quotes':
    case 'purchases':
      content = <Documents key={route} section={page} {...common} />;
      break;
    case 'new':
      content = (
        <DocumentEditor
          key={route}
          company={me.company}
          kind={id === 'quote' ? 'quote' : id === 'purchase' ? 'purchase' : 'invoice'}
          {...common}
        />
      );
      break;
    case 'edit':
      content = (
        <DocumentEditor key={route} id={id} kind="invoice" company={me.company} {...common} />
      );
      break;
    case 'document':
      content = <DocumentDetail key={id} id={id} company={me.company} {...common} />;
      break;
    case 'payments':
      content = <Payments key={route} {...common} />;
      break;
    case 'catalog':
      content = <Catalog key={route} {...common} />;
      break;
    case 'contacts':
      content = <Contacts key={route} {...common} />;
      break;
    case 'accounting':
      content = <Accounting key={route} {...common} admin={me.user.role === 'admin'} />;
      break;
    case 'imports':
    case 'settings':
      content = (
        <Settings
          {...common}
          me={me}
          section={page === 'imports' ? 'imports' : id}
          onRefresh={async () => setMe(await api<Me>('/me'))}
          onSelectWorkspace={async (workspaceId) => {
            if (!canNavigate()) return;
            const profile = await api<Me>('/me', { workspaceId });
            await api('/workspaces/' + workspaceId + '/select', { method: 'POST', body: {} });
            // Unmount old forms before changing the tab's request context.
            cancelNavigationMotion();
            flushSync(() => setSwitching(true));
            setActiveWorkspace(workspaceId);
            setMe(profile);
            setRoute('overview');
            navigate('overview');
            setToast(null);
            setSwitching(false);
            requestAnimationFrame(() => document.getElementById('main-content')?.focus());
          }}
        />
      );
      break;
    case 'audit':
      content = <Audit key={route} me={me} />;
      break;
    default:
      content = <Dashboard {...common} name={me.user.name} />;
  }
  const designArea = areaForRoute(route, documentSection);
  const shortcutIds: Record<string, string[]> = {
    sales: ['recurring'],
    quotes: ['quote-revisions'],
    purchases: ['ocr'],
    payments: ['reconciliation'],
    contacts: [],
    catalog: ['price-lists'],
    accounting: ['financial-year'],
    templates: ['template-layout'],
    imports: ['historical-import'],
    settings: ['fine-permissions'],
  };
  if (page === 'document' && designArea === 'sales') shortcutIds.sales = ['duplicate'];
  if (
    page === 'settings' &&
    ['company', 'billing', 'series', 'buyer-policies', 'users', 'security'].includes(id)
  ) {
    shortcutIds.settings = [
      {
        company: 'configuration-history',
        billing: 'tax-profile',
        series: 'journals',
        'buyer-policies': 'buyer-formats',
        users: 'fine-permissions',
        security: 'account-recovery',
      }[id]!,
    ];
  }
  const shortcuts = (shortcutIds[designArea] || []).map((id) =>
    featureDesigns.find((f) => f.id === id)!,
  );
  return (
    <FeatureDesignContext.Provider
      value={{
        area: designArea,
        shortcuts,
        open: (id) => setDesignDraft({ area: designArea, id }),
      }}
    >
      <div
        className={`app-shell${embedded ? ' is-embedded' : sidebarHidden && !narrow ? ' navigation-collapsed' : ''}`}
      >
        <a
          className="skip-link"
          href="#main-content"
          onClick={(e) => {
            e.preventDefault();
            document.getElementById('main-content')?.focus();
          }}
        >
          Saltar al contenido
        </a>
        {!embedded && (
          <Sidebar
            user={me.user}
            current={current}
            navigation={navigation}
            mobile={mobile}
            narrow={narrow}
            hidden={sidebarHidden}
            onHide={() => setSidebarHidden(true)}
            onShow={() => {
              if (narrow) setMobile(true);
              else setSidebarHidden(false);
            }}
            onSearch={() => {
              setMobile(false);
              requestAnimationFrame(openCommandSearch);
            }}
            onClose={() => setMobile(false)}
            onLogout={async () => {
              try {
                await api('/auth/logout', { method: 'POST', body: {} });
                cancelNavigationMotion();
                setActiveWorkspace(null);
                setMe(null);
              } catch (error) {
                notify((error as Error).message);
              }
            }}
          />
        )}
        <div className="main-shell" inert={!embedded && narrow && mobile}>
          <ModuleHeaderContext.Provider
            value={{
              tools: <CommandSearchTrigger />,
            }}
          >
            <main id="main-content" tabIndex={-1} key={me.workspaceId}>
              {switching ? <Loading /> : content}
            </main>
          </ModuleHeaderContext.Provider>
        </div>
        <CommandSearch readonly={readonly} admin={me.user.role === 'admin'} hideTrigger />
        {designDraft && (
          <FeatureDesigns
            area={designDraft.area}
            initialId={designDraft.id}
            onClose={() => setDesignDraft(null)}
          />
        )}
        {toast && (
          <div className="toast" role="status">
            <Check size={17} />
            <span>{toast.message}</span>
            {toast.action && (
              <a href={'#' + toast.action.to} onClick={() => setToast(null)}>
                {toast.action.label}
              </a>
            )}
            <button aria-label="Cerrar aviso" onClick={() => setToast(null)}>
              <X size={15} />
            </button>
          </div>
        )}
      </div>
    </FeatureDesignContext.Provider>
  );
}
