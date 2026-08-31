import { makeButton } from '../button/button.ts';

export interface AddMenuItem { label: string; text: string }
export function makeAddMenu(items: readonly AddMenuItem[], onAdd: (text: string) => void): HTMLElement {
  const wrap = document.createElement('div'); wrap.className = 'add-menu';
  let lastFocus: HTMLElement | null = null;
  const close = () => { menu.hidden = true; lastFocus?.focus(); };
  const trigger = makeButton('＋', 'Add an item', () => {
    lastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : trigger;
    menu.hidden = !menu.hidden;
    if (!menu.hidden) menu.querySelector<HTMLButtonElement>('button')?.focus();
  }, 'add-menu-trigger');
  const menu = document.createElement('div'); menu.className = 'add-menu-popover'; menu.hidden = true;
  menu.setAttribute('role', 'menu');
  items.forEach(item => { const button = makeButton(item.label, `Add ${item.label}`, () => { onAdd(item.text); close(); }, 'add-menu-item'); button.setAttribute('role', 'menuitem'); menu.append(button); });
  menu.addEventListener('keydown', event => { if (event.key === 'Escape') { close(); event.preventDefault(); } });
  wrap.append(trigger, menu); return wrap;
}
