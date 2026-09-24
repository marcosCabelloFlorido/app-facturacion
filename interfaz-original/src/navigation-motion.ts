import { flushSync } from 'react-dom';

export type NavigationDirection = 'forward' | 'back' | 'across';
type MotionOptions = {
  target: () => HTMLElement | null;
  direction?: NavigationDirection;
  scope?: 'page' | 'section';
  mainSectionChange?: boolean;
};

let cancelActive: (() => void) | undefined;

export function cancelNavigationMotion() {
  cancelActive?.();
}

// Wait for the first content batch, with a limit so slow requests can show their loader.
function contentReady(target: HTMLElement, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    let timer: ReturnType<typeof setTimeout>;
    const finish = () => {
      clearTimeout(timer);
      observer.disconnect();
      signal.removeEventListener('abort', finish);
      resolve();
    };
    const observer = new MutationObserver(() => {
      if (!target.querySelector('.loading')) finish();
    });
    if (signal.aborted || !target.querySelector('.loading')) return resolve();
    observer.observe(target, { childList: true, subtree: true });
    signal.addEventListener('abort', finish, { once: true });
    timer = setTimeout(finish, 1200);
  });
}

/** One shared transition; updates run once even when a second navigation interrupts it. */
export function transitionContent(update: () => void, options: MotionOptions) {
  cancelNavigationMotion();
  const target = options.target();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if (
    !options.mainSectionChange ||
    !target ||
    reduced.matches ||
    document.visibilityState === 'hidden'
  ) {
    flushSync(update);
    return;
  }

  const root = document.documentElement;
  const controller = new AbortController();
  const direction = options.direction || 'across';
  const scope = options.scope || 'page';
  let applied = false;

  let animation: Animation | undefined;
  const originalOpacity = target.style.opacity;

  const apply = () => {
    if (applied) return;
    applied = true;
    flushSync(update);
  };
  const clean = () => {
    if (cancelActive !== cancel) return;
    controller.abort();
    animation?.cancel();
    target.style.opacity = originalOpacity;

    delete root.dataset.navigationMotion;
    delete root.dataset.navigationScope;
    reduced.removeEventListener('change', cancel);
    cancelActive = undefined;
  };
  const cancel = () => {
    apply();

    animation?.cancel();
    clean();
  };
  cancelActive = cancel;
  reduced.addEventListener('change', cancel, { once: true });

  // Fade out before replacing the DOM; keep the incoming content hidden until ready.
  // Only the live main content participates, never the fixed sidebar.
  root.dataset.navigationMotion = direction;
  root.dataset.navigationScope = scope;
  void (async () => {
    try {
      animation = target.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 120,
        easing: 'ease-in',
        fill: 'forwards',
      });
      await animation.finished;
      if (controller.signal.aborted) return;
      target.style.opacity = '0';
      animation.cancel();
      apply();
      await contentReady(target, controller.signal);
      if (controller.signal.aborted || !target.isConnected) return;
      animation = target.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 320,
        easing: 'ease-in-out',
        fill: 'forwards',
      });
      await animation.finished;
    } catch {
      // An interrupted transition still applies its navigation exactly once.
      apply();
    } finally {
      clean();
    }
  })();
}
export function navigationEntryIndex(): number | undefined {
  return (window as Window & { navigation?: { currentEntry?: { index: number } } }).navigation
    ?.currentEntry?.index;
}

export function routeDirection(
  from: string,
  to: string,
  options: { backLink?: boolean; previousIndex?: number; nextIndex?: number } = {},
): NavigationDirection {
  if (
    options.backLink ||
    (options.previousIndex !== undefined &&
      options.nextIndex !== undefined &&
      options.nextIndex < options.previousIndex)
  )
    return 'back';
  const depth = (route: string) => {
    const [path, query] = route.split('?');
    if (/^(document|new|edit)\//.test(path)) return path.startsWith('edit/') ? 2 : 1;
    const params = new URLSearchParams(query);
    return path.includes('/') ||
      ['contact', 'product', 'payment', 'fund', 'entry', 'batch'].some((key) => params.has(key))
      ? 1
      : 0;
  };
  const difference = depth(to) - depth(from);
  return difference > 0 ? 'forward' : difference < 0 ? 'back' : 'across';
}
