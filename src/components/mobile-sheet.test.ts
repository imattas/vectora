import { describe, expect, it } from 'vitest';
import { swipeState } from './mobile-sheet.ts';

describe('mobile sheet gestures', () => {
  it('maps meaningful vertical swipes to sheet states', () => {
    expect(swipeState(40)).toBe('collapsed');
    expect(swipeState(-40)).toBe('open');
    expect(swipeState(12)).toBeNull();
    expect(swipeState(Number.NaN)).toBeNull();
    expect(swipeState(40, -1)).toBe('collapsed');
    expect(swipeState(40, Number.NaN)).toBe('collapsed');
  });
});
