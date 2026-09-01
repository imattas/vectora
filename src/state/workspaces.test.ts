import { describe, expect, it } from 'vitest';
import { exportWorkspaces, importWorkspaces, saveWorkspace } from './workspaces.ts';

describe('workspaces', () => {
  it('keeps empty or unavailable storage safe', () => {
    expect(() => saveWorkspace('Demo', ['y = x'], undefined, { grid: true, axes: true, labels: true, points: true, snap: false, angleUnit: 'degrees' })).not.toThrow();
    expect(saveWorkspace('Demo', ['y = x'], undefined, { grid: false, axes: false, labels: true, points: true, snap: true, angleUnit: 'radians' }).settings?.angleUnit).toBe('radians');
  });

  it('rejects malformed backups', () => {
    expect(() => importWorkspaces('{}')).toThrow(/Invalid Vectora workspace backup/);
    expect(typeof exportWorkspaces()).toBe('string');
  });
});
