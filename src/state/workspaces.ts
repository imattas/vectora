export interface Workspace {
  id: string;
  name: string;
  updatedAt: number;
  equations: string[];
  view?: { cx: number; cy: number; upp: number };
  camera?: { target: [number, number, number]; radius: number; theta: number; phi: number };
  settings?: { grid: boolean; axes: boolean; labels: boolean; points: boolean; snap: boolean; angleUnit: 'degrees' | 'radians' };
}

const STORAGE_KEY = 'vectora-workspaces-v1';
const MAX_EQUATION_LENGTH = 100_000;
const MAX_BACKUP_LENGTH = 5_000_000;
const MAX_WORKSPACES = 100;
const newWorkspaceId = (items: readonly Workspace[]): string => {
  let id = '';
  try { id = typeof crypto?.randomUUID === 'function' ? crypto.randomUUID() : ''; } catch {}
  if (!id) id = `workspace-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  while (items.some(item => item.id === id)) id += '-1';
  return id;
};
const validView = (value: unknown): value is NonNullable<Workspace['view']> => {
  if (!value || typeof value !== 'object') return false;
  const view = value as Record<string, unknown>;
  return Number.isFinite(view.cx) && Number.isFinite(view.cy) && Number.isFinite(view.upp) && Number(view.upp) > 0;
};
const validSettings = (value: unknown): value is NonNullable<Workspace['settings']> => {
  if (!value || typeof value !== 'object') return false;
  const settings = value as Record<string, unknown>;
  return ['grid', 'axes', 'labels', 'points', 'snap'].every(key => typeof settings[key] === 'boolean')
    && (settings.angleUnit === 'degrees' || settings.angleUnit === 'radians');
};
const validCamera = (value: unknown): value is NonNullable<Workspace['camera']> => {
  if (!value || typeof value !== 'object') return false;
  const camera = value as Record<string, unknown>;
  return Array.isArray(camera.target) && camera.target.length === 3
    && camera.target.every(component => Number.isFinite(component))
    && Number.isFinite(camera.radius) && Number(camera.radius) > 0
    && Number.isFinite(camera.theta) && Number.isFinite(camera.phi);
};
const normalize = (item: Partial<Workspace>): Workspace | null => {
  if (typeof item.id !== 'string' || !item.id || typeof item.name !== 'string' || !item.name.trim() || !Array.isArray(item.equations)) return null;
  const view = validView(item.view) ? { cx: item.view.cx, cy: item.view.cy, upp: item.view.upp } : undefined;
  const camera = validCamera(item.camera) ? { target: [...item.camera.target] as [number, number, number], radius: item.camera.radius, theta: item.camera.theta, phi: item.camera.phi } : undefined;
  const settings = validSettings(item.settings) ? { ...item.settings } : undefined;
  return {
    id: item.id,
    name: item.name.trim().slice(0, 120),
    updatedAt: Number.isFinite(item.updatedAt) ? item.updatedAt! : Date.now(),
    equations: item.equations.filter((value): value is string => typeof value === 'string' && value.length <= MAX_EQUATION_LENGTH).slice(0, 500),
    view,
    camera,
    settings,
  };
};
const read = (): Workspace[] => {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(value)
      ? value.map(item => normalize(item)).filter((item): item is Workspace => item !== null).slice(0, MAX_WORKSPACES)
      : [];
  } catch { return []; }
};
const write = (items: Workspace[]) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {} };

export function listWorkspaces(): Workspace[] { return read().sort((a, b) => b.updatedAt - a.updatedAt); }
export function loadWorkspace(id: string): Workspace | null { return read().find(item => item.id === id) ?? null; }
export function saveWorkspace(name: string, equations: string[], view?: Workspace['view'], settings?: Workspace['settings'], camera?: Workspace['camera']): Workspace {
  const cleanName = name.trim().slice(0, 120);
  if (!cleanName) throw new Error('Workspace name cannot be empty.');
  const items = read(); const existing = items.find(item => item.name === cleanName);
  const workspace = normalize({
    id: existing?.id ?? newWorkspaceId(items), name: cleanName, updatedAt: Date.now(),
    equations: equations.filter((value): value is string => typeof value === 'string').slice(0, 500), view, settings, camera,
  })!;
  write([workspace, ...items.filter(item => item.id !== workspace.id)].slice(0, MAX_WORKSPACES)); return workspace;
}
export function deleteWorkspace(id: string): void { write(read().filter(item => item.id !== id)); }
export function exportWorkspaces(): string { return JSON.stringify({ version: 1, workspaces: listWorkspaces() }, null, 2); }
export function importWorkspaces(serialized: string): number {
  if (typeof serialized !== 'string' || serialized.length > MAX_BACKUP_LENGTH) throw new Error('Workspace backup is too large.');
  let parsed: { version?: number; workspaces?: Workspace[] };
  try {
    parsed = JSON.parse(serialized) as { version?: number; workspaces?: Workspace[] };
  } catch {
    throw new Error('Invalid Vectora workspace backup.');
  }
  if (parsed.version !== 1 || !Array.isArray(parsed.workspaces)) throw new Error('Invalid Vectora workspace backup.');
  const incoming = parsed.workspaces.map(item => normalize(item)).filter((item): item is Workspace => item !== null);
  const merged = [...read()];
  for (const item of incoming) { const index = merged.findIndex(existing => existing.id === item.id); if (index >= 0) merged[index] = item; else merged.push(item); }
  const kept = merged.slice(0, MAX_WORKSPACES);
  write(kept);
  const keptIds = new Set(kept.map(item => item.id));
  return incoming.filter(item => keptIds.has(item.id)).length;
}
