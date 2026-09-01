import { describe, expect, it } from 'vitest';
import { exportWorkspaces, importWorkspaces, saveWorkspace } from './workspaces.ts';

describe('workspaces', () => {
  it('keeps empty or unavailable storage safe', () => {
    expect(() => saveWorkspace('Demo', ['y = x'])).not.toThrow();
  });

  it('rejects malformed backups', () => {
    expect(() => importWorkspaces('{}')).toThrow(/Invalid Vectora workspace backup/);
    expect(typeof exportWorkspaces()).toBe('string');
  });
});
