import { makeButton } from '../button/button.ts';

export interface AddMenuItem { label: string; text: string }
let nextMenuId = 0;

export function makeAddMenu(items: readonly AddMenuItem[], onAdd: (text: string) => void): HTMLElement {
  const wrap = document.createElement('div'); wrap.className = 'add-menu';
  let lastFocus: HTMLElement | null = null;
  const close = () => { menu.hidden = true; trigger.setAttribute('aria-expanded', 'false'); lastFocus?.focus(); };
  const trigger = makeButton('＋', 'Add an item', () => {
    lastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : trigger;
    menu.hidden = !menu.hidden;
    trigger.setAttribute('aria-expanded', String(!menu.hidden));
    if (!menu.hidden) menu.querySelector<HTMLButtonElement>('button')?.focus();
  }, 'add-menu-trigger');
  trigger.setAttribute('aria-haspopup', 'menu'); trigger.setAttribute('aria-expanded', 'false');
  const menu = document.createElement('div'); menu.className = 'add-menu-popover'; menu.id = `add-menu-${++nextMenuId}`; menu.hidden = true;
  trigger.setAttribute('aria-controls', menu.id);
  menu.setAttribute('role', 'menu');
  const choices: HTMLButtonElement[] = [];
  items.forEach(item => { const button = makeButton(item.label, `Add ${item.label}`, () => { onAdd(item.text); close(); }, 'add-menu-item'); button.setAttribute('role', 'menuitem'); choices.push(button); menu.append(button); });
  menu.addEventListener('keydown', event => {
    if (event.key === 'Escape') { close(); event.preventDefault(); return; }
    if (!choices.length) return;
    const current = choices.indexOf(document.activeElement as HTMLButtonElement);
    let next = current;
    if (event.key === 'ArrowDown') next = current < choices.length - 1 ? current + 1 : 0;
    else if (event.key === 'ArrowUp') next = current > 0 ? current - 1 : choices.length - 1;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = choices.length - 1;
    else return;
    choices[next].focus(); event.preventDefault();
  });
  document.addEventListener('pointerdown', event => { if (!menu.hidden && event.target instanceof Node && !wrap.contains(event.target)) close(); });
  wrap.append(trigger, menu); return wrap;
}
