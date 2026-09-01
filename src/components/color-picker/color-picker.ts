export function makeColorPicker(
  colors: readonly string[],
  selected: number,
  onSelect: (index: number) => void,
  onClose?: () => void,
): HTMLElement {
  const box = document.createElement('div');
  box.className = 'color-picker'; box.hidden = true; box.contentEditable = 'false'; box.setAttribute('role', 'listbox');
  const closePicker = () => { box.hidden = true; onClose?.(); };
  const wheel = document.createElement('div'); wheel.className = 'color-wheel'; wheel.title = 'Choose a hue'; wheel.setAttribute('aria-label', 'Color wheel');
  const marker = document.createElement('span'); marker.className = 'color-wheel-marker';
  const choose = (event: PointerEvent, close = false) => {
    if (!colors.length) return;
    const rect = wheel.getBoundingClientRect();
    if (!(rect.width > 0) || !(rect.height > 0)) return;
    const hue = (Math.atan2(event.clientY - rect.top - rect.height / 2, event.clientX - rect.left - rect.width / 2) * 180 / Math.PI + 360) % 360;
    const index = Math.min(colors.length - 1, Math.floor(hue / 360 * colors.length));
    setActive(index); onSelect(index); marker.style.transform = `rotate(${hue}deg) translateY(-${rect.width * .38}px)`;
    if (close) closePicker();
  };
  wheel.addEventListener('pointerdown', event => { wheel.setPointerCapture(event.pointerId); choose(event); event.preventDefault(); });
  wheel.addEventListener('pointermove', event => { if (wheel.hasPointerCapture(event.pointerId)) choose(event); });
  wheel.addEventListener('pointerup', event => { if (wheel.hasPointerCapture(event.pointerId)) { choose(event, true); wheel.releasePointerCapture(event.pointerId); } });
  wheel.addEventListener('pointercancel', event => { if (wheel.hasPointerCapture(event.pointerId)) wheel.releasePointerCapture(event.pointerId); });
  wheel.append(marker); box.append(wheel);
  const swatches = document.createElement('div'); swatches.className = 'color-wheel-swatches';
  let activeIndex = Number.isFinite(selected) ? Math.max(0, Math.min(colors.length - 1, Math.floor(selected))) : 0;
  const setActive = (index: number, focus = false) => {
    if (!colors.length) return;
    activeIndex = (index + colors.length) % colors.length;
    colors.forEach((_, i) => swatches.children[i]?.setAttribute('aria-selected', String(i === activeIndex)));
    if (focus) (swatches.children[activeIndex] as HTMLButtonElement | undefined)?.focus();
  };
  colors.forEach((color, index) => {
    const swatch = document.createElement('button');
    swatch.type = 'button'; swatch.className = 'color-swatch'; swatch.style.background = color;
    swatch.title = `Color ${index + 1}`;
    swatch.setAttribute('role', 'option');
    swatch.setAttribute('aria-label', `Color ${index + 1}`);
    swatch.setAttribute('aria-selected', String(index === activeIndex));
    swatch.addEventListener('click', () => {
      setActive(index); onSelect(index); closePicker();
    });
    swatches.append(swatch);
  });
  box.addEventListener('keydown', event => {
    if (event.key === 'Escape') { closePicker(); event.preventDefault(); return; }
    if (!colors.length) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') { setActive(activeIndex + 1, true); event.preventDefault(); return; }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') { setActive(activeIndex - 1, true); event.preventDefault(); return; }
    if (event.key === 'Home') { setActive(0, true); event.preventDefault(); return; }
    if (event.key === 'End') { setActive(colors.length - 1, true); event.preventDefault(); }
  });
  box.append(swatches);
  return box;
}
