import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { LucideIcon } from 'lucide-react';
import './tubelight-navbar.css';

export type TubelightNavItem = { name: string; icon: LucideIcon; url?: string };

// Floating pill navbar: capsule + neon "tubelight" glow slide between items.
// Pure CSS transitions driven by measured DOM positions (no animation library).
export function TubelightNavbar({
  items,
  activeTab,
  onTabChange,
  className = '',
}: {
  items: TubelightNavItem[];
  activeTab?: string;
  onTabChange?: (name: string) => void;
  className?: string;
}) {
  const [internalActive, setInternalActive] = useState(items[0]?.name);
  const active = activeTab ?? internalActive;
  const listRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false });

  const setActive = (name: string) => {
    if (activeTab === undefined) setInternalActive(name);
    onTabChange?.(name);
  };

  useLayoutEffect(() => {
    const container = listRef.current;
    const activeButton = container?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!container || !activeButton) return;
    const update = () =>
      setIndicator({ left: activeButton.offsetLeft, width: activeButton.offsetWidth, ready: true });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [active, items.length]);

  const focusTabAt = (index: number) => {
    listRef.current?.querySelectorAll<HTMLElement>('[role="tab"]')[index]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = items.findIndex((item) => item.name === active);
    if (index < 0) return;
    let next = -1;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % items.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp')
      next = (index - 1 + items.length) % items.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = items.length - 1;
    if (next < 0) return;
    event.preventDefault();
    setActive(items[next].name);
    focusTabAt(next);
  };

  return (
    <div className={`tubelight-navbar ${className}`.trim()}>
      <div
        className="tubelight-navbar-list"
        role="tablist"
        aria-orientation="horizontal"
        ref={listRef}
        onKeyDown={onKeyDown}
      >
        <span
          className="tubelight-navbar-pill"
          style={{
            transform: `translateX(${indicator.left}px)`,
            width: indicator.width,
            opacity: indicator.ready ? 1 : 0,
          }}
          aria-hidden="true"
        />
        {items.map((item) => {
          const isActive = item.name === active;
          const Icon = item.icon;
          const inner = (
            <>
              {isActive && (
                <span className="tubelight-lamp" aria-hidden="true">
                  <span className="tubelight-lamp-bar" />
                  <span className="tubelight-lamp-glow tubelight-lamp-glow-1" />
                  <span className="tubelight-lamp-glow tubelight-lamp-glow-2" />
                  <span className="tubelight-lamp-glow tubelight-lamp-glow-3" />
                </span>
              )}
              <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
              <span className="tubelight-navbar-label">{item.name}</span>
            </>
          );
          const shared = {
            key: item.name,
            role: 'tab' as const,
            'aria-selected': isActive,
            'aria-label': item.name,
            tabIndex: isActive ? 0 : -1,
            className: `tubelight-navbar-item${isActive ? ' is-active' : ''}`,
          };
          return item.url ? (
            <a {...shared} href={item.url} onClick={() => setActive(item.name)}>
              {inner}
            </a>
          ) : (
            <button {...shared} type="button" onClick={() => setActive(item.name)}>
              {inner}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Ejemplo de uso:
// <TubelightNavbar
//   items={[
//     { name: 'Home', icon: Home },
//     { name: 'About', icon: User },
//     { name: 'Projects', icon: Briefcase },
//     { name: 'Resume', icon: FileText },
//   ]}
//   activeTab={activeTab}
//   onTabChange={setActiveTab}
// />
