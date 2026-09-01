import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { exportWorkspaces, importWorkspaces, saveWorkspace } from './workspaces.ts';

describe('workspaces', () => {
  beforeEach(() => {
    let value: string | null = null;
    vi.stubGlobal('localStorage', {
      getItem: () => value,
      setItem: (_key: string, next: string) => { value = next; },
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('keeps empty or unavailable storage safe', () => {
    expect(() => saveWorkspace('Demo', ['y = x'], undefined, { grid: true, axes: true, labels: true, points: true, snap: false, angleUnit: 'degrees' })).not.toThrow();
    expect(saveWorkspace('Demo', ['y = x'], undefined, { grid: false, axes: false, labels: true, points: true, snap: true, angleUnit: 'radians' }).settings?.angleUnit).toBe('radians');
  });

  it('saves when randomUUID is unavailable', () => {
    vi.stubGlobal('crypto', { randomUUID: undefined });
    const saved = saveWorkspace('Fallback ID', ['y = x']);
    expect(saved.id).toMatch(/^workspace-/);
  });

  it('rejects malformed backups', () => {
    expect(() => importWorkspaces('{}')).toThrow(/Invalid Vectora workspace backup/);
    expect(typeof exportWorkspaces()).toBe('string');
  });

  it('drops malformed view and settings metadata during import', () => {
    importWorkspaces(JSON.stringify({ version: 1, workspaces: [{ id: 'safe', name: ' Safe ', equations: ['y=x'], view: { cx: 0, cy: 0, upp: -1 }, settings: { grid: 'yes' } }] }));
    const backup = JSON.parse(exportWorkspaces());
    const safe = backup.workspaces.find((workspace: { id: string }) => workspace.id === 'safe');
    expect(safe.name).toBe('Safe');
    expect(safe.view).toBeUndefined();
    expect(safe.settings).toBeUndefined();
  });

  it('normalizes names and rejects empty saves', () => {
    expect(() => saveWorkspace('   ', ['y=x'])).toThrow(/cannot be empty/);
    const workspace = saveWorkspace(`  ${'A'.repeat(200)}  `, Array.from({ length: 600 }, (_, i) => `y=${i}`));
    expect(workspace.name.length).toBe(120);
    expect(workspace.equations).toHaveLength(500);
  });

  it('round-trips a valid 3D camera and drops an invalid one', () => {
    const camera = { target: [1, 2, 3] as [number, number, number], radius: 8, theta: 1.2, phi: 0.7 };
    const saved = saveWorkspace('3D scene', ['(u, v, u+v)'], undefined, undefined, camera);
    expect(saved.camera).toEqual(camera);
    importWorkspaces(JSON.stringify({ version: 1, workspaces: [{ id: 'bad-camera', name: 'Bad', equations: ['y=x'], camera: { target: [0, 0], radius: 0, theta: 0, phi: 0 } }] }));
    const backup = JSON.parse(exportWorkspaces());
    expect(backup.workspaces.find((workspace: { id: string }) => workspace.id === 'bad-camera').camera).toBeUndefined();
  });

  it('bounds imported backup and equation sizes', () => {
    expect(() => importWorkspaces('x'.repeat(5_000_001))).toThrow('too large');
    const saved = saveWorkspace('bounded', ['y = ' + 'x'.repeat(99_996)]);
    expect(saved.equations).toHaveLength(1);
    expect(saveWorkspace('discarded', ['y = ' + 'x'.repeat(100_001)]).equations).toEqual([]);
  });
});
