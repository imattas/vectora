import { makeButton } from './button/button.ts';
import { makeIcon } from './icon.ts';
export interface KeyboardKey { label: string; insert: string; cursorOffset?: number; wrapSelection?: 'fraction' | 'sqrt' | 'abs' | 'power' | 'function'; wrapper?: string }
export const KEY_GROUPS: ReadonlyArray<readonly [string, readonly KeyboardKey[]]> = [
  ['Numbers', '1234567890.'.split('').map(label => ({ label, insert: label }))],
  ['Operators', ['+', '−', '×', '÷', '/', '=', '(', ')', ',', '|'].map(label => ({
    label,
    insert: ({ '−': '-', '×': '*', '÷': '/' } as Record<string, string>)[label] ?? label,
  }))],
  ['Powers & fractions', [
    { label: 'xʸ', insert: '^', cursorOffset: 1 }, { label: 'x²', insert: '^2', wrapSelection: 'power' },
    { label: '√', insert: 'sqrt(', cursorOffset: 5, wrapSelection: 'sqrt' }, { label: 'a/b', insert: '(1)/(2)', cursorOffset: 1, wrapSelection: 'fraction' },
    { label: 'abs', insert: 'abs(', cursorOffset: 4, wrapSelection: 'abs' },
  ]],
  ['Functions', ['sin', 'cos', 'tan', 'sqrt', 'cbrt', 'nroot', 'abs', 'ln', 'log', 'exp', 'floor', 'ceil'].map(label => ({ label, insert: `${label}(`, cursorOffset: label.length + 1, wrapSelection: 'function' as const, wrapper: label }))],
  ['Common', [
    { label: 'π', insert: 'pi' }, { label: 'τ', insert: 'tau' },
    { label: 'e', insert: 'e' }, { label: 'i', insert: 'i' }, { label: '∞', insert: 'inf' },
  ]],
  ['Comparisons', ['≤', '≥', '<', '>', '='].map(label => ({
    label,
    // The display glyphs are not the parser's canonical comparison tokens.
    insert: ({ '≤': '<=', '≥': '>=' } as Record<string, string>)[label] ?? label,
  }))],
  ['Calculus', [
    { label: '∫', insert: 'int[0..1] ' }, { label: 'Σ', insert: 'sum(n=1..10, )', cursorOffset: 13 },
    { label: 'Π', insert: 'prod(n=1..10, )', cursorOffset: 14 },
  ]],
  ['Geometry', [
    ...['θ', 'φ', 'α', 'β', 'γ', 'Δ'].map(label => ({ label, insert: label })),
    { label: '⊥ bisector', insert: 'perpendicularBisector((0, 0), (1, 0))' },
    { label: 'tangent', insert: 'tangent(circle((0, 0), 1), (1, 0))' },
  ]],
] as const;
export interface SymbolKeyboardOptions { onBeforeOpen?: () => void; onInsert: (symbol: string, cursorOffset?: number, wrapSelection?: KeyboardKey['wrapSelection'], wrapper?: string) => void; }
export const isKeyboardShortcut = (event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey'>): boolean =>
  event.key === '/' && (event.ctrlKey || event.metaKey);
export function makeSymbolKeyboard({ onBeforeOpen, onInsert }: SymbolKeyboardOptions): HTMLElement {
  const wrap = document.createElement('div'); wrap.className = 'symbol-keyboard-wrap';
  const trigger = makeButton('', 'Open symbol keyboard', () => { onBeforeOpen?.(); popover.hidden = !popover.hidden; trigger.setAttribute('aria-expanded', String(!popover.hidden)); if (!popover.hidden) popover.querySelector<HTMLButtonElement>('.symbol-key')?.focus(); }, 'sidebar-action symbol-keyboard-trigger');
  trigger.append(makeIcon('keyboard'));
  trigger.setAttribute('aria-haspopup', 'dialog'); trigger.setAttribute('aria-expanded', 'false'); trigger.setAttribute('aria-keyshortcuts', 'Control+/ Meta+/');
  const popover = document.createElement('div'); popover.className = 'symbol-keyboard-popover'; popover.id = 'symbol-keyboard-popover'; popover.hidden = true; popover.setAttribute('role', 'dialog'); popover.setAttribute('aria-label', 'Calculator keyboard'); trigger.setAttribute('aria-controls', popover.id);
  const heading = document.createElement('div'); heading.className = 'symbol-keyboard-heading';
  const title = document.createElement('strong'); title.className = 'symbol-keyboard-title'; title.id = 'symbol-keyboard-title'; title.textContent = 'Calculator keyboard'; heading.append(title);
  const close = makeButton('', 'Close symbol keyboard', () => { popover.hidden = true; trigger.setAttribute('aria-expanded', 'false'); trigger.focus(); }, 'symbol-keyboard-close');
  close.append(makeIcon('close')); heading.append(close); popover.append(heading);
  popover.setAttribute('aria-labelledby', title.id);
  for (const [name, keys] of KEY_GROUPS) { const heading = document.createElement('div'); heading.className = 'symbol-keyboard-group'; heading.textContent = name; popover.append(heading); const row = document.createElement('div'); row.className = 'symbol-keyboard-row'; for (const key of keys) row.append(makeButton(key.label, `Insert ${key.label}`, () => onInsert(key.insert, key.cursorOffset, key.wrapSelection, key.wrapper), 'symbol-key')); popover.append(row); }
  popover.addEventListener('keydown', event => { if (event.key === 'Escape') { close.click(); event.preventDefault(); } });
  document.addEventListener('pointerdown', event => { if (!popover.hidden && event.target instanceof Node && !wrap.contains(event.target)) close.click(); });
  document.addEventListener('keydown', event => {
    if (isKeyboardShortcut(event)) {
      event.preventDefault(); onBeforeOpen?.(); popover.hidden = false;
      trigger.setAttribute('aria-expanded', 'true'); popover.querySelector<HTMLButtonElement>('.symbol-key')?.focus();
    } else if (event.key === 'Escape' && !popover.hidden) close.click();
  });
  wrap.append(trigger, popover); return wrap;
}
