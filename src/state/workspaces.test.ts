import { describe, expect, it } from 'vitest';
import { saveWorkspace } from './workspaces.ts';

describe('workspaces', () => {
  it('keeps empty or unavailable storage safe', () => {
    expect(() => saveWorkspace('Demo', ['y = x'])).not.toThrow();
  });
});
