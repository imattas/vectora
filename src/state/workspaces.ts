export interface Workspace {
  id: string;
  name: string;
  updatedAt: number;
  equations: string[];
  view?: { cx: number; cy: number; upp: number };
}

const STORAGE_KEY = 'vectora-workspaces-v1';
const read = (): Workspace[] => {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(value) ? value.filter(item => item && typeof item.id === 'string' && typeof item.name === 'string' && Array.isArray(item.equations)) : [];
  } catch { return []; }
};
const write = (items: Workspace[]) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {} };

export function listWorkspaces(): Workspace[] { return read().sort((a, b) => b.updatedAt - a.updatedAt); }
export function saveWorkspace(name: string, equations: string[], view?: Workspace['view']): Workspace {
  const items = read(); const existing = items.find(item => item.name === name);
  const workspace: Workspace = { id: existing?.id ?? crypto.randomUUID(), name, updatedAt: Date.now(), equations: equations.filter(Boolean), view };
  write([workspace, ...items.filter(item => item.id !== workspace.id)]); return workspace;
}
export function deleteWorkspace(id: string): void { write(read().filter(item => item.id !== id)); }
