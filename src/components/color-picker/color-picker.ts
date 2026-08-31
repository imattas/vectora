export function makeColorPicker(colors: readonly string[], selected: number, onSelect: (index: number) => void): HTMLElement {
  const box = document.createElement('div');
  box.className = 'color-picker'; box.hidden = true; box.setAttribute('role', 'listbox');
  const wheel = document.createElement('div'); wheel.className = 'color-wheel'; wheel.title = 'Choose a hue'; wheel.setAttribute('aria-label', 'Color wheel');
  const marker = document.createElement('span'); marker.className = 'color-wheel-marker';
  const choose = (event: PointerEvent, close = false) => {
    const rect = wheel.getBoundingClientRect();
    const hue = (Math.atan2(event.clientY - rect.top - rect.height / 2, event.clientX - rect.left - rect.width / 2) * 180 / Math.PI + 360) % 360;
    const index = Math.min(colors.length - 1, Math.floor(hue / 360 * colors.length));
    onSelect(index); marker.style.transform = `rotate(${hue}deg) translateY(-${rect.width * .38}px)`;
    if (close) box.hidden = true;
  };
  wheel.addEventListener('pointerdown', event => { wheel.setPointerCapture(event.pointerId); choose(event); event.preventDefault(); });
  wheel.addEventListener('pointermove', event => { if (wheel.hasPointerCapture(event.pointerId)) choose(event); });
  wheel.addEventListener('pointerup', event => { if (wheel.hasPointerCapture(event.pointerId)) { choose(event, true); wheel.releasePointerCapture(event.pointerId); } });
  wheel.addEventListener('pointercancel', event => { if (wheel.hasPointerCapture(event.pointerId)) wheel.releasePointerCapture(event.pointerId); });
  wheel.append(marker); box.append(wheel);
  const swatches = document.createElement('div'); swatches.className = 'color-wheel-swatches';
  colors.forEach((color, index) => {
    const swatch = document.createElement('button');
    swatch.type = 'button'; swatch.className = 'color-swatch'; swatch.style.background = color;
    swatch.title = `Color ${index + 1}`;
    swatch.setAttribute('role', 'option');
    swatch.setAttribute('aria-label', `Color ${index + 1}`);
    swatch.setAttribute('aria-selected', String(index === selected));
    swatch.addEventListener('click', () => {
      colors.forEach((_, i) => swatches.children[i]?.setAttribute('aria-selected', String(i === index)));
      onSelect(index); box.hidden = true;
    });
    swatches.append(swatch);
  });
  box.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    box.hidden = true;
    event.preventDefault();
  });
  box.append(swatches);
  return box;
}
