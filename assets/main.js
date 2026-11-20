(() => {
  'use strict';

  const root = document.documentElement;
  const meta = document.querySelector('meta[name="color-scheme"]');
  const toggle = document.querySelector('.theme-toggle');
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

  const readStored = () => {
    try { return localStorage.getItem('tellsy-theme'); } catch { return null; }
  };
  const writeStored = value => {
    try {
      if (value === 'light' || value === 'dark') localStorage.setItem('tellsy-theme', value);
      else localStorage.removeItem('tellsy-theme');
    } catch { /* Storage can be blocked; the current page still works. */ }
  };
  const renderedScheme = () => {
    if (meta && (meta.content === 'light' || meta.content === 'dark')) return meta.content;
    return systemDark.matches ? 'dark' : 'light';
  };
  const updateToggleLabel = () => {
    if (!toggle) return;
    const target = renderedScheme() === 'dark' ? 'light' : 'dark';
    const label = target === 'light' ? toggle.dataset.labelLight : toggle.dataset.labelDark;
    if (!label) return;
    toggle.setAttribute('aria-label', label);
    toggle.setAttribute('title', label);
  };
  const applyScheme = value => {
    if (!meta) return;
    if (value === 'light' || value === 'dark') {
      meta.content = value;
      root.dataset.theme = value;
      writeStored(value);
    } else {
      meta.content = 'light dark';
      delete root.dataset.theme;
      writeStored(null);
    }
    updateToggleLabel();
  };

  // The inline head script already applied a stored override before paint.
  const initial = readStored();
  if (initial === 'light' || initial === 'dark') root.dataset.theme = initial;
  else delete root.dataset.theme;
  updateToggleLabel();

  if (toggle) {
    toggle.addEventListener('click', () => {
      const target = renderedScheme() === 'dark' ? 'light' : 'dark';
      const systemScheme = systemDark.matches ? 'dark' : 'light';
      // Returning to the system value removes the override instead of pinning it.
      applyScheme(target === systemScheme ? null : target);
    });
  }

  const onSystemChange = () => {
    if (!meta || (meta.content !== 'light' && meta.content !== 'dark')) updateToggleLabel();
  };
  if (systemDark.addEventListener) systemDark.addEventListener('change', onSystemChange);
  else systemDark.addListener(onSystemChange);

  window.addEventListener('storage', event => {
    if (event.key !== 'tellsy-theme' || !meta) return;
    if (event.newValue === 'light' || event.newValue === 'dark') {
      meta.content = event.newValue;
      root.dataset.theme = event.newValue;
    } else {
      meta.content = 'light dark';
      delete root.dataset.theme;
    }
    updateToggleLabel();
  });

  // Responsive navigation: one semantic list, measured instead of a hard-coded breakpoint.
  const header = document.querySelector('.site-header');
  const inner = document.querySelector('.header-inner');
  const menu = document.getElementById('site-menu');
  const menuButton = document.querySelector('.menu-button');
  const supportsPopover = Object.hasOwn(HTMLElement.prototype, 'popover');
  let fallbackOpen = false;
  let lastWidth = inner ? inner.clientWidth : 0;

  const syncNav = () => {
    if (!header || !inner || !menu) return;

    const wasOpen = supportsPopover && menu.matches(':popover-open');
    if (wasOpen) {
      try { menu.hidePopover(); } catch { /* Already closed. */ }
    }
    if (supportsPopover && menu.hasAttribute('popover')) menu.removeAttribute('popover');

    header.classList.add('is-measuring', 'is-wide');
    const wide = inner.scrollWidth <= inner.clientWidth + 1;
    header.classList.remove('is-measuring');
    header.classList.toggle('is-wide', wide);

    if (wide) {
      if (supportsPopover) menu.removeAttribute('popover');
      menu.hidden = false;
      fallbackOpen = false;
      menuButton && menuButton.setAttribute('aria-expanded', 'false');
      return;
    }

    if (supportsPopover) {
      menu.setAttribute('popover', 'auto');
      if (wasOpen) {
        try { menu.showPopover(); } catch { /* Browser refused; the trigger still works. */ }
      }
      menuButton && menuButton.setAttribute('aria-expanded', String(wasOpen));
    } else {
      menu.hidden = !fallbackOpen;
      menuButton && menuButton.setAttribute('aria-expanded', String(fallbackOpen));
    }
  };

  if (menuButton && menu && !supportsPopover) {
    menuButton.removeAttribute('popovertarget');
    menuButton.addEventListener('click', () => {
      fallbackOpen = !fallbackOpen;
      menu.hidden = !fallbackOpen;
      menuButton.setAttribute('aria-expanded', String(fallbackOpen));
    });
  }

  if (menu && menuButton) {
    menu.addEventListener('toggle', event => {
      menuButton.setAttribute('aria-expanded', String(event.newState === 'open'));
    });
    menu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        fallbackOpen = false;
        if (supportsPopover) {
          try { menu.hidePopover(); } catch { /* Not open. */ }
        }
        menuButton.setAttribute('aria-expanded', 'false');
      });
    });
  }

  syncNav();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(syncNav);

  if ('ResizeObserver' in window && inner) {
    const observer = new ResizeObserver(() => {
      if (!inner) return;
      if (Math.abs(inner.clientWidth - lastWidth) < 1) return;
      lastWidth = inner.clientWidth;
      requestAnimationFrame(syncNav);
    });
    observer.observe(inner);
  }

  let resizeFrame = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(syncNav);
  });
})();
