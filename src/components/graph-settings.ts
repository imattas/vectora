export interface GraphSettings {
  grid: boolean;
  axes: boolean;
  labels: boolean;
  points: boolean;
  snap: boolean;
  angleUnit: 'degrees' | 'radians';
}

export const DEFAULT_GRAPH_SETTINGS: GraphSettings = { grid: true, axes: true, labels: true, points: true, snap: false, angleUnit: 'degrees' };
const STORAGE_KEY = 'vectora-graph-settings-v1';

export function loadGraphSettings(): GraphSettings {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<GraphSettings> | null;
    const value = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    const bool = (key: keyof Pick<GraphSettings, 'grid' | 'axes' | 'labels' | 'points' | 'snap'>) =>
      typeof value[key] === 'boolean' ? value[key] as boolean : DEFAULT_GRAPH_SETTINGS[key];
    return {
      grid: bool('grid'), axes: bool('axes'), labels: bool('labels'),
      points: bool('points'), snap: bool('snap'),
      angleUnit: value.angleUnit === 'radians' ? 'radians' : 'degrees',
    };
  } catch { return { ...DEFAULT_GRAPH_SETTINGS }; }
}

export function saveGraphSettings(settings: GraphSettings): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch { /* private mode */ }
}
