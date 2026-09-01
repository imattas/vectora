type OpenMenu = { menu: HTMLElement; trigger: HTMLButtonElement; close: (restoreFocus?: boolean) => void };
const openMenus = new Set<OpenMenu>();
let menuListenersInstalled = false;
let nextMenuId = 0;

function installMenuListeners() {
  if (menuListenersInstalled) return;
  menuListenersInstalled = true;
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const hadOpenMenu = openMenus.size > 0;
    for (const entry of [...openMenus]) {
      if (!entry.trigger.isConnected) { entry.close(); continue; }
      entry.close(true);
    }
    if (hadOpenMenu) event.preventDefault();
  });
  document.addEventListener('pointerdown', event => {
    for (const entry of [...openMenus]) {
      if (!entry.trigger.isConnected) { entry.close(); continue; }
      if (event.target instanceof Node && !entry.menu.contains(event.target) && event.target !== entry.trigger) entry.close();
    }
  });
  if (typeof MutationObserver !== 'undefined' && document.documentElement) {
    const observer = new MutationObserver(() => {
      for (const entry of [...openMenus]) if (!entry.trigger.isConnected) entry.close();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
}

export function makeRowOptions(title: string, actions: Array<{ label: string; onClick: () => void }>): HTMLElement {
  installMenuListeners();
  const menu = document.createElement('div'); menu.className = 'row-options'; menu.hidden = true;
  menu.id = `row-options-${++nextMenuId}`;
  menu.setAttribute('role', 'menu');
  const wrap = document.createElement('div'); wrap.className = 'row-options-wrap';
  const entry: OpenMenu = { menu, trigger: null as unknown as HTMLButtonElement, close: () => {} };
  const closeMenu = () => {
    menu.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    openMenus.delete(entry);
    if (menu.parentElement !== wrap) {
      menu.removeAttribute('style');
      wrap.append(menu);
    }
  };
  for (const action of actions) {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = action.label;
    button.setAttribute('role', 'menuitem');
    button.addEventListener('click', () => { closeMenu(); action.onClick(); }); menu.append(button);
  }
  const trigger = document.createElement('button'); trigger.type = 'button'; trigger.className = 'row-options-trigger';
  entry.trigger = trigger;
  entry.close = (restoreFocus = false) => { closeMenu(); if (restoreFocus) trigger.focus(); };
  trigger.textContent = '⋮'; trigger.title = title; trigger.setAttribute('aria-label', title);
  trigger.setAttribute('aria-haspopup', 'menu'); trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-controls', menu.id);
  trigger.addEventListener('click', e => {
    e.stopPropagation();
    if (!menu.hidden) { closeMenu(); return; }
    const rect = trigger.getBoundingClientRect();
    openMenus.add(entry);
    document.body.append(menu);
    menu.hidden = false;
    menu.style.position = 'fixed';
    const menuWidth = Math.min(112, Math.max(0, window.innerWidth - 16));
    const left = Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8));
    const top = Math.max(8, Math.min(rect.bottom + 4, window.innerHeight - 8));
    menu.style.top = `${Math.round(top)}px`;
    menu.style.left = `${Math.round(left)}px`;
    menu.style.right = 'auto';
    trigger.setAttribute('aria-expanded', 'true');
    menu.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
  });
  menu.addEventListener('click', e => e.stopPropagation());
  menu.addEventListener('keydown', event => {
    const items = [...menu.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')];
    if (event.key === 'Escape') { closeMenu(); trigger.focus(); event.preventDefault(); return; }
    if (!items.length) return;
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    const delta = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
    if (delta) {
      items[(current + delta + items.length) % items.length].focus();
      event.preventDefault();
    } else if (event.key === 'Home' || event.key === 'End') {
      items[event.key === 'Home' ? 0 : items.length - 1].focus();
      event.preventDefault();
    }
  });
  wrap.append(trigger, menu); return wrap;
}
