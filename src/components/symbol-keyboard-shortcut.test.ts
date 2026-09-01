import { describe, expect, it } from 'vitest';
import { isKeyboardShortcut } from './symbol-keyboard.ts';

describe('symbol keyboard shortcut', () => {
  it('accepts Ctrl+/ and Cmd+/ but not an unmodified slash', () => {
    expect(isKeyboardShortcut({ key: '/', ctrlKey: true, metaKey: false })).toBe(true);
    expect(isKeyboardShortcut({ key: '/', ctrlKey: false, metaKey: true })).toBe(true);
    expect(isKeyboardShortcut({ key: '/', ctrlKey: false, metaKey: false })).toBe(false);
  });
});
