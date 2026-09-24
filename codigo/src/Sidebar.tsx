import { useEffect, useRef } from 'react';
import { Menu, LogOut, Settings, Search, X, type LucideIcon } from 'lucide-react';
import type { User } from '../shared/domain';
import { labels } from '../shared/domain';
import './sidebar.css';

type NavigationSection = {
  section: string;
  items: { id: string; label: string; icon: LucideIcon }[];
};

export function Sidebar({
  user,
  current,
  navigation,
  mobile,
  narrow,
  hidden,
  onClose,
  onHide,
  onShow,
  onLogout,
  onSearch,
}: {
  user: User;
  current: string;
  navigation: NavigationSection[];
  mobile: boolean;
  narrow: boolean;
  hidden: boolean;
  onClose: () => void;
  onHide: () => void;
  onShow: () => void;
  onLogout: () => void;
  onSearch: () => void;
}) {
  const sidebar = useRef<HTMLElement>(null);
  const pointerInside = useRef(false);
  const keyboardInside = useRef(false);
  const collapsed = !narrow && hidden;
  const isHidden = narrow && !mobile;
  const wasHidden = useRef(isHidden);
  useEffect(() => {
    // Focus after React has removed inert/aria-hidden from the opened sidebar.
    if (wasHidden.current && !isHidden) {
      (narrow
        ? sidebar.current?.querySelector<HTMLButtonElement>('.sidebar-hide')
        : document.getElementById('navigation-toggle')
      )?.focus();
    }
    wasHidden.current = isHidden;
  }, [isHidden, narrow]);
  useEffect(() => {
    if (!narrow || !mobile) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    sidebar.current?.querySelector<HTMLButtonElement>('.sidebar-hide')?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [narrow, mobile]);

  const closeMenu = () => {
    onClose();
    requestAnimationFrame(() => document.getElementById('navigation-toggle')?.focus());
  };

  return (
    <>
      {isHidden && (
        <button
          type="button"
          id="navigation-toggle"
          className="sidebar-reopen"
          aria-label="Mostrar menú"
          aria-controls="app-navigation"
          aria-expanded={false}
          onClick={onShow}
        >
          <Menu size={19} aria-hidden="true" />
          <span>Menú</span>
        </button>
      )}
      {narrow && mobile && (
        <button
          className="sidebar-backdrop"
          tabIndex={-1}
          aria-label="Cerrar navegación"
          onClick={closeMenu}
        />
      )}
      <aside
        ref={sidebar}
        id="app-navigation"
        className={`sidebar compact-sidebar${mobile ? ' is-open' : ''}${collapsed ? ' is-collapsed' : ''}`}
        inert={isHidden}
        aria-hidden={isHidden}
        role={narrow ? 'dialog' : undefined}
        aria-modal={narrow && mobile ? true : undefined}
        aria-label="Menú de navegación"
        onScroll={(event) => {
          // Focusing a wide link while the rail expands must not scroll its labels sideways.
          if (event.currentTarget.scrollLeft) event.currentTarget.scrollLeft = 0;
        }}
        onPointerEnter={(event) => {
          if (narrow || event.pointerType === 'touch') return;
          pointerInside.current = true;
          onShow();
        }}
        onPointerLeave={() => {
          pointerInside.current = false;
          if (!narrow && !keyboardInside.current) onHide();
        }}
        onPointerDown={() => {
          keyboardInside.current = false;
          if (!narrow) onShow();
        }}
        onFocusCapture={(event) => {
          if (!narrow && event.target.matches(':focus-visible')) {
            keyboardInside.current = true;
            onShow();
          }
        }}
        onBlurCapture={(event) => {
          if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
          keyboardInside.current = false;
          if (!narrow && !pointerInside.current) onHide();
        }}
        onKeyDown={(event) => {
          if (!narrow || !mobile) return;
          if (event.key === 'Escape') {
            event.preventDefault();
            closeMenu();
          }
          if (event.key === 'Tab') {
            const controls = Array.from(
              event.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'),
            ).filter((element) => element.getClientRects().length > 0);
            const first = controls[0];
            const last = controls[controls.length - 1];
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <div className="sidebar-heading">
          <a
            className="brand sidebar-row"
            href="#overview"
            aria-label="Facturee · Inicio"
            onClick={() => {
              if (narrow && current === 'overview') closeMenu();
            }}
          >
            <span className="sidebar-label">
              facturee<span className="brand-dot">.</span>
            </span>
          </a>
          {narrow && (
            <button
              type="button"
              className="sidebar-hide"
              aria-label="Cerrar menú"
              title="Cerrar menú"
              aria-controls="app-navigation"
              aria-expanded={!isHidden}
              onClick={closeMenu}
            >
              <X size={18} aria-hidden="true" />
            </button>
          )}
        </div>
        <button
          type="button"
          className="sidebar-search sidebar-row"
          aria-label="Buscar acciones y secciones"
          aria-haspopup="dialog"
          title="Buscar acciones y secciones · Ctrl+K"
          onClick={onSearch}
        >
          <span className="sidebar-icon">
            <Search size={18} aria-hidden="true" />
          </span>
          <span className="sidebar-label">Buscar acciones…</span>
        </button>
        <nav aria-label="Navegación principal">
          {navigation.map((section, index) => (
            <section
              className="nav-section"
              key={section.section}
              aria-labelledby={`navigation-group-${index}`}
            >
              <h2 className="sidebar-section-title" id={`navigation-group-${index}`}>
                {section.section}
              </h2>
              {section.items.map((item) => (
                <a
                  href={`#${item.id}`}
                  key={item.id}
                  className={`nav-item sidebar-row ${current === item.id ? 'active' : ''}`}
                  aria-current={current === item.id ? 'page' : undefined}
                  aria-label={item.label}
                  title={collapsed ? item.label : undefined}
                  onClick={() => {
                    if (narrow && current === item.id) closeMenu();
                  }}
                >
                  <span className="sidebar-icon">
                    <item.icon
                      size={18}
                      strokeWidth={current === item.id ? 2.1 : 1.6}
                      aria-hidden="true"
                    />
                  </span>
                  <span className="sidebar-label">{item.label}</span>
                </a>
              ))}
            </section>
          ))}
        </nav>
        <section className="sidebar-bottom" aria-labelledby="navigation-group-company">
          <h2 className="sidebar-section-title" id="navigation-group-company">
            EMPRESA
          </h2>
          <div className="sidebar-account">
            <div className="user-profile sidebar-row">
              <span className="sidebar-icon">
                <span className="user-avatar">
                  {user.avatar ? (
                    <img src={user.avatar} alt="" />
                  ) : (
                    user.name
                      .split(' ')
                      .map((part) => part[0])
                      .slice(0, 2)
                      .join('')
                  )}
                </span>
              </span>
              <div className="sidebar-label">
                <strong>{user.name}</strong>
                <small>{labels[user.role]}</small>
              </div>
              <a
                href="#settings"
                className="sidebar-account-action sidebar-settings"
                aria-label="Configuración"
                title="Configuración"
                aria-current={current === 'settings' ? 'page' : undefined}
                onClick={() => {
                  if (narrow && current === 'settings') closeMenu();
                }}
              >
                <Settings size={18} strokeWidth={current === 'settings' ? 2.1 : 1.6} />
                <span className="sidebar-settings-label">Configuración</span>
              </a>
              <button
                type="button"
                className="sidebar-account-action sidebar-logout"
                aria-label="Cerrar sesión"
                title="Cerrar sesión"
                onClick={onLogout}
              >
                <LogOut size={18} strokeWidth={1.6} />
              </button>
            </div>
          </div>
        </section>
      </aside>
    </>
  );
}
