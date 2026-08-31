import { makeButton } from './button/button.ts';
const GROUPS = [['Common', ['π', 'τ', 'e', 'i', '∞', '×', '÷', '−']], ['Comparisons', ['≤', '≥', '<', '>', '=']], ['Calculus', ['∫', 'Σ', 'Π']], ['Geometry', ['θ', 'φ', 'α', 'β', 'γ', 'Δ']]] as const;
export interface SymbolKeyboardOptions { onBeforeOpen?: () => void; onInsert: (symbol: string) => void; }
export function makeSymbolKeyboard({ onBeforeOpen, onInsert }: SymbolKeyboardOptions): HTMLElement {
  const wrap = document.createElement('div'); wrap.className = 'symbol-keyboard-wrap';
  const trigger = makeButton('⌨', 'Open symbol keyboard', () => { onBeforeOpen?.(); popover.hidden = !popover.hidden; trigger.setAttribute('aria-expanded', String(!popover.hidden)); if (!popover.hidden) popover.querySelector<HTMLButtonElement>('.symbol-key')?.focus(); }, 'sidebar-action symbol-keyboard-trigger');
  trigger.setAttribute('aria-expanded', 'false');
  const popover = document.createElement('div'); popover.className = 'symbol-keyboard-popover'; popover.hidden = true; popover.setAttribute('role', 'dialog'); popover.setAttribute('aria-label', 'Special character keyboard');
  const title = document.createElement('div'); title.className = 'symbol-keyboard-title'; title.textContent = 'Special characters'; popover.append(title);
  for (const [name, symbols] of GROUPS) { const heading = document.createElement('div'); heading.className = 'symbol-keyboard-group'; heading.textContent = name; popover.append(heading); const row = document.createElement('div'); row.className = 'symbol-keyboard-row'; for (const symbol of symbols) row.append(makeButton(symbol, `Insert ${symbol}`, () => onInsert(symbol), 'symbol-key')); popover.append(row); }
  const close = makeButton('Close', 'Close symbol keyboard', () => { popover.hidden = true; trigger.setAttribute('aria-expanded', 'false'); trigger.focus(); }, 'symbol-keyboard-close'); popover.append(close);
  popover.addEventListener('keydown', event => { if (event.key === 'Escape') { close.click(); event.preventDefault(); } }); wrap.append(trigger, popover); return wrap;
}
