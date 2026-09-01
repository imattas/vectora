import { describe, expect, it } from 'vitest';
import { getFunctionCompletions } from './function-autocomplete.ts';

describe('function autocomplete', () => {
  it('only returns supported functions and geometry forms', () => {
    expect(getFunctionCompletions('sq')).toContain('sqrt');
    expect(getFunctionCompletions('circ')).toContain('circle');
    expect(getFunctionCompletions('not-a-function')).toEqual([]);
  });

  it('normalizes malformed completion limits', () => {
    expect(getFunctionCompletions('s', -1)).toEqual([]);
    expect(getFunctionCompletions('s', Number.NaN)).toHaveLength(8);
    expect(getFunctionCompletions('s', 2.9)).toHaveLength(2);
  });
});
