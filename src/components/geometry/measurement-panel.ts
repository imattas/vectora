import type { GeometryAnalysis } from '../../math/geometry-analysis.ts';

export function renderMeasurementPanel(container: HTMLElement, analysis: GeometryAnalysis) {
  container.replaceChildren();
  const entries = [...analysis.readouts.entries()];
  if (!entries.length) { container.hidden = true; return; }
  container.hidden = false;
  const title = document.createElement('div');
  title.className = 'geometry-panel-title';
  title.id = 'geometry-measurements-title';
  title.textContent = 'Measurements';
  container.setAttribute('role', 'status');
  container.setAttribute('aria-live', 'polite');
  container.setAttribute('aria-labelledby', title.id);
  container.append(title);
  for (const [row, value] of entries) {
    const item = document.createElement('div');
    item.className = 'geometry-readout';
    const objects = analysis.byRow.get(row) ?? [];
    const rawLabel = objects[0]?.label?.replace(/\d+$/, '');
    const label = row < 0 ? 'Intersection angle' : rawLabel ? rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1) : `Measurement ${row + 1}`;
    item.textContent = `${label}: ${value}`;
    container.append(item);
  }
}
