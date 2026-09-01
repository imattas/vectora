import { makeButton } from './button/button.ts';
export interface KeyboardKey { label: string; insert: string }
export const KEY_GROUPS: ReadonlyArray<readonly [string, readonly KeyboardKey[]]> = [
  ['Numbers', '1234567890.'.split('').map(label => ({ label, insert: label }))],
  ['Operators', ['+', '−', '×', '÷', '/', '=', '(', ')', ',', '|'].map(label => ({
    label,
    insert: ({ '−': '-', '×': '*', '÷': '/' } as Record<string, string>)[label] ?? label,
  }))],
  ['Powers & fractions', [
    { label: 'xʸ', insert: '^' }, { label: 'x²', insert: '^2' },
    { label: '√', insert: 'sqrt(' }, { label: 'a/b', insert: '1/2' },
    { label: 'abs', insert: 'abs(' },
  ]],
  ['Functions', ['sin', 'cos', 'tan', 'sqrt', 'abs', 'ln', 'log', 'exp', 'floor', 'ceil'].map(label => ({ label, insert: `${label}(` }))],
  ['Common', [
    { label: 'π', insert: 'pi' }, { label: 'τ', insert: 'tau' },
    { label: 'e', insert: 'e' }, { label: 'i', insert: 'i' }, { label: '∞', insert: 'inf' },
  ]],
  ['Comparisons', ['≤', '≥', '<', '>', '='].map(label => ({ label, insert: label }))],
  ['Calculus', [
    { label: '∫', insert: 'int[0..1] ' }, { label: 'Σ', insert: 'sum(n=1..10, )' },
    { label: 'Π', insert: 'prod(n=1..10, )' },
  ]],
  ['Geometry', ['θ', 'φ', 'α', 'β', 'γ', 'Δ'].map(label => ({ label, insert: label }))],
] as const;
export interface SymbolKeyboardOptions { onBeforeOpen?: () => void; onInsert: (symbol: string) => void; }
export const isKeyboardShortcut = (event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey'>): boolean =>
  event.key === '/' && (event.ctrlKey || event.metaKey);
export function makeSymbolKeyboard({ onBeforeOpen, onInsert }: SymbolKeyboardOptions): HTMLElement {
  const wrap = document.createElement('div'); wrap.className = 'symbol-keyboard-wrap';
  const trigger = makeButton('⌨', 'Open symbol keyboard', () => { onBeforeOpen?.(); popover.hidden = !popover.hidden; trigger.setAttribute('aria-expanded', String(!popover.hidden)); if (!popover.hidden) popover.querySelector<HTMLButtonElement>('.symbol-key')?.focus(); }, 'sidebar-action symbol-keyboard-trigger');
  trigger.setAttribute('aria-expanded', 'false'); trigger.setAttribute('aria-keyshortcuts', 'Control+/ Meta+/');
  const popover = document.createElement('div'); popover.className = 'symbol-keyboard-popover'; popover.hidden = true; popover.setAttribute('role', 'dialog'); popover.setAttribute('aria-label', 'Calculator keyboard');
  const title = document.createElement('div'); title.className = 'symbol-keyboard-title'; title.textContent = 'Calculator keyboard'; popover.append(title);
  for (const [name, keys] of KEY_GROUPS) { const heading = document.createElement('div'); heading.className = 'symbol-keyboard-group'; heading.textContent = name; popover.append(heading); const row = document.createElement('div'); row.className = 'symbol-keyboard-row'; for (const key of keys) row.append(makeButton(key.label, `Insert ${key.label}`, () => onInsert(key.insert), 'symbol-key')); popover.append(row); }
  const close = makeButton('Close', 'Close symbol keyboard', () => { popover.hidden = true; trigger.setAttribute('aria-expanded', 'false'); trigger.focus(); }, 'symbol-keyboard-close'); popover.append(close);
  popover.addEventListener('keydown', event => { if (event.key === 'Escape') { close.click(); event.preventDefault(); } });
  document.addEventListener('keydown', event => {
    if (isKeyboardShortcut(event)) {
      event.preventDefault(); onBeforeOpen?.(); popover.hidden = false;
      trigger.setAttribute('aria-expanded', 'true'); popover.querySelector<HTMLButtonElement>('.symbol-key')?.focus();
    } else if (event.key === 'Escape' && !popover.hidden) close.click();
  });
  wrap.append(trigger, popover); return wrap;
}
