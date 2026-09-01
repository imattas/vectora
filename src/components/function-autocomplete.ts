import { FUNCTIONS } from '../math/expr.ts';

export const COMPLETIONS = [...FUNCTIONS, 'line', 'segment', 'ray', 'circle', 'polygon', 'square', 'angle', 'distance', 'midpoint', 'projection', 'intersection']
  .filter((name, index, all) => all.indexOf(name) === index).sort();

export function getFunctionCompletions(prefix: string, limit = 8): string[] {
  const query = prefix.toLowerCase();
  if (!query) return [];
  return COMPLETIONS.filter(name => name.toLowerCase().startsWith(query)).slice(0, limit);
}
