import { describe, expect, it } from 'vitest';
import { KEY_GROUPS } from './symbol-keyboard.ts';
import { parseExpr } from '../math/expr.ts';

describe('symbol keyboard', () => {
  it('offers calculator-ready numeric, power, fraction, and symbol keys', () => {
    const labels = KEY_GROUPS.flatMap(([, keys]) => keys.map(key => key.label));
    expect(labels).toEqual(expect.arrayContaining(['0', '9', 'xʸ', '√', 'a/b', 'sqrt', 'sin', 'π', '∫']));
    expect(KEY_GROUPS.flatMap(([, keys]) => keys).find(key => key.label === 'xʸ')?.insert).toBe('^');
    expect(KEY_GROUPS.flatMap(([, keys]) => keys).find(key => key.label === 'π')?.insert).toBe('pi');
    expect(KEY_GROUPS.flatMap(([, keys]) => keys).find(key => key.label === '√')?.cursorOffset).toBe(5);
    expect(KEY_GROUPS.flatMap(([, keys]) => keys).find(key => key.label === 'a/b')?.insert).toBe('(1)/(2)');
    expect(KEY_GROUPS.flatMap(([, keys]) => keys).find(key => key.label === 'sin')?.wrapper).toBe('sin');
    expect(KEY_GROUPS.flatMap(([, keys]) => keys).find(key => key.label === '≤')?.insert).toBe('<=');
    expect(KEY_GROUPS.flatMap(([, keys]) => keys).find(key => key.label === '≥')?.insert).toBe('>=');
    expect(() => parseExpr(`x ${KEY_GROUPS.flatMap(([, keys]) => keys).find(key => key.label === '≤')?.insert} 2`)).not.toThrow();
  });
});
