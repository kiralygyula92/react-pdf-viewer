/**
 * Browser behaviour of the docs shell: theme toggle, version selector, sidebar disclosure, table
 * of contents highlighting and the search dialog. Plain DOM, so the shell needs no hydration.
 */

/** Light / dark switch. The icon shows the current theme; the choice persists per viewer. */
function themeToggle() {
  const root = document.documentElement;
  const media = matchMedia('(prefers-color-scheme: dark)');
  const isDark = () =>
    root.dataset['theme'] === 'dark' || (root.dataset['theme'] === undefined && media.matches);
  const buttons = [...document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]')];
  if (buttons.length === 0) return;
  const sync = () => {
    for (const button of buttons) button.setAttribute('aria-pressed', String(isDark()));
  };
  sync();
  // Following the OS setting until the viewer chooses: keep the icon in step when it changes.
  media.addEventListener('change', sync);
  for (const button of buttons) {
    button.addEventListener('click', () => {
      const next = isDark() ? 'light' : 'dark';
      root.dataset['theme'] = next;
      try {
        localStorage.setItem('ppds-theme', next);
      } catch {
        // Storage unavailable: the choice lasts for this page view.
      }
      sync();
    });
  }
}

function versionSelect() {
  for (const select of document.querySelectorAll<HTMLSelectElement>('[data-version-select]')) {
    select.addEventListener('change', () => {
      window.location.href = select.value;
    });
  }
}

function sidebar() {
  const panel = document.querySelector<HTMLDetailsElement>('[data-sidebar]');
  if (!panel) return;
  // Wide screens always show the sidebar; narrow screens collapse it into a disclosure above the
  // page (no menu button in the header). Without JavaScript it simply stays open.
  const narrow = window.matchMedia('(max-width: 900px)');
  const sync = () => {
    panel.open = !narrow.matches;
  };
  sync();
  narrow.addEventListener('change', sync);
  // Keep the current page visible inside the sidebar without scrolling the document.
  const current = panel.querySelector<HTMLElement>('[aria-current="page"]');
  if (current) {
    const offset = current.getBoundingClientRect().top - panel.getBoundingClientRect().top;
    panel.scrollTop = Math.max(0, offset - panel.clientHeight / 3);
  }
}

function toc() {
  const links = new Map(
    [...document.querySelectorAll<HTMLAnchorElement>('[data-toc-link]')].map((link) => [
      link.dataset['tocLink'],
      link,
    ]),
  );
  if (links.size === 0) return;
  const visible = new Set<string>();
  const order = [...links.keys()];
  const update = () => {
    const active = order.find((slug) => slug !== undefined && visible.has(slug)) ?? null;
    for (const [slug, link] of links) {
      if (slug === active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  };
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target.id);
        else visible.delete(entry.target.id);
      }
      update();
    },
    { rootMargin: '-72px 0px -60% 0px' },
  );
  for (const slug of order) {
    const target = slug ? document.getElementById(slug) : null;
    if (target) observer.observe(target);
  }
}

function search() {
  const dialog = document.querySelector<HTMLDialogElement>('[data-search-dialog]');
  const openButton = document.querySelector<HTMLButtonElement>('[data-search-open]');
  let loaded = false;

  async function load() {
    if (loaded || !dialog) return;
    loaded = true;
    const container = dialog.querySelector<HTMLElement>('#ppds-search');
    try {
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = '/pagefind/pagefind-ui.css';
      document.head.append(css);
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = '/pagefind/pagefind-ui.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Search index unavailable'));
        document.head.append(script);
      });
      const PagefindUI = (window as unknown as { PagefindUI: new (options: object) => unknown })
        .PagefindUI;
      const filters: Record<string, string> = {};
      if (container?.dataset['plugin']) filters['plugin'] = container.dataset['plugin'];
      if (container?.dataset['version']) filters['version'] = container.dataset['version'];
      new PagefindUI({
        element: '#ppds-search',
        showSubResults: true,
        resetStyles: false,
        filters,
      });
      container?.querySelector<HTMLInputElement>('input')?.focus();
    } catch {
      if (container)
        container.textContent = 'Search is available in the built site (run a production build).';
    }
  }

  function open() {
    if (!dialog) return;
    dialog.showModal();
    void load().then(() => dialog.querySelector<HTMLInputElement>('input')?.focus());
  }

  openButton?.addEventListener('click', open);
  dialog?.querySelector('[data-search-close]')?.addEventListener('click', () => dialog.close());
  dialog?.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  document.addEventListener('keydown', (event) => {
    const target = event.target as HTMLElement | null;
    const typing = target?.closest('input, textarea, select, [contenteditable="true"]');
    if (event.key === '/' && !typing && !dialog?.open) {
      event.preventDefault();
      open();
    }
  });
}

/** Wires every shell behaviour. Safe to call once per page load. */
export function initShell() {
  themeToggle();
  versionSelect();
  sidebar();
  toc();
  search();
}
