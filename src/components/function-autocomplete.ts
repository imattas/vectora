import { FUNCTIONS } from '../math/expr.ts';

export const COMPLETIONS = [...FUNCTIONS, 'line', 'segment', 'ray', 'circle', 'polygon', 'square', 'angle', 'distance', 'midpoint', 'projection', 'intersection']
  .filter((name, index, all) => all.indexOf(name) === index).sort();

export function getFunctionCompletions(prefix: string, limit = 8): string[] {
  if (typeof prefix !== 'string') return [];
  const query = prefix.toLowerCase();
  if (!query) return [];
  const count = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 8;
  return COMPLETIONS.filter(name => name.toLowerCase().startsWith(query)).slice(0, count);
}
