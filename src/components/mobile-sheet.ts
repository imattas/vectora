export type SheetState = 'open' | 'collapsed';
import { makeIcon } from './icon.ts';

export function swipeState(deltaY: number, threshold = 30): SheetState | null {
  const limit = Number.isFinite(threshold) && threshold >= 0 ? threshold : 30;
  if (!Number.isFinite(deltaY) || Math.abs(deltaY) < limit) return null;
  return deltaY > 0 ? 'collapsed' : 'open';
}

export interface MobileSheet {
  setState(state: SheetState): void;
  toggle(): void;
  isCollapsed(): boolean;
  destroy(): void;
}

/** Bind the accessible toggle and header swipe for the narrow-screen sheet. */
export function initMobileSheet(
  panel: HTMLElement,
  toggle: HTMLButtonElement,
  header: HTMLElement,
  isMobile: () => boolean = () => window.matchMedia('(max-width: 640px)').matches,
): MobileSheet {
  let state: SheetState = panel.classList.contains('mobile-collapsed') ? 'collapsed' : 'open';
  let pointer: { id: number; y: number } | null = null;
  const setState = (next: SheetState) => {
    state = next;
    panel.classList.toggle('mobile-collapsed', next === 'collapsed');
    toggle.setAttribute('aria-expanded', String(next === 'open'));
    toggle.replaceChildren(makeIcon(next === 'collapsed' ? 'menu' : 'close'), document.createTextNode(next === 'collapsed' ? ' Expressions' : ' Close panel'));
  };
  const onToggle = () => setState(state === 'open' ? 'collapsed' : 'open');
  const onDown = (event: PointerEvent) => {
    if (!isMobile()) return;
    pointer = { id: event.pointerId, y: event.clientY };
    try { header.setPointerCapture(event.pointerId); } catch {}
  };
  const onUp = (event: PointerEvent) => {
    if (!pointer || pointer.id !== event.pointerId) return;
    const next = swipeState(event.clientY - pointer.y); if (next) setState(next); pointer = null;
  };
  const onCancel = () => { pointer = null; };
  const onKeyDown = (event: KeyboardEvent) => {
    if (!isMobile() || event.key !== 'Escape' || state === 'collapsed') return;
    setState('collapsed');
    toggle.focus();
    event.preventDefault();
  };
  toggle.addEventListener('click', onToggle);
  header.addEventListener('pointerdown', onDown);
  header.addEventListener('pointerup', onUp);
  header.addEventListener('pointercancel', onCancel);
  panel.addEventListener('keydown', onKeyDown);
  return { setState, toggle: onToggle, isCollapsed: () => state === 'collapsed', destroy: () => { toggle.removeEventListener('click', onToggle); header.removeEventListener('pointerdown', onDown); header.removeEventListener('pointerup', onUp); header.removeEventListener('pointercancel', onCancel); panel.removeEventListener('keydown', onKeyDown); } };
}
