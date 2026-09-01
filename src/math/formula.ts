import { type Expr, evaluate, freeVars, parseExpr } from './expr.ts';

export interface FormulaInsight { label: string; value: string }

export function inspectFormula(text: string): FormulaInsight[] {
  const parsed = parseExpr(text);
  const vars = [...freeVars(parsed)].filter(v => !['x', 'y', 'z', 't'].includes(v));
  const out: FormulaInsight[] = [];
  if (parsed.kind === 'eq') out.push({ label: 'relation', value: 'equation' });
  if (vars.length) out.push({ label: 'variables', value: vars.join(', ') });
  return out;
}

export function solveScalar(text: string, variable?: string, env: Record<string, number> = {}): { variable: string; value: number } | null {
  const parsed = parseExpr(text);
  const residual: Expr = parsed.kind === 'eq' ? { kind: 'bin', op: '-', a: parsed.l, b: parsed.r } : parsed;
  const candidates = variable ? [variable] : [...freeVars(residual)].filter(v => !['x', 'y', 'z', 't'].includes(v));
  if (candidates.length !== 1) return null;
  const name = candidates[0];
  const valueAt = (x: number) => evaluate(residual, { ...env, [name]: x });
  const y0 = valueAt(0), y1 = valueAt(1), y2 = valueAt(2);
  const slope = y1 - y0;
  if (!Number.isFinite(y0) || !Number.isFinite(y1) || !Number.isFinite(y2) || !Number.isFinite(slope)
    || Math.abs(slope) < 1e-12 || Math.abs((y2 - y1) - slope) > 1e-8) return null;
  const value = -y0 / slope;
  return Number.isFinite(value) ? { variable: name, value } : null;
}

export function solveLinearSystem(texts: readonly string[], variables: readonly string[] = ['x', 'y'], env: Record<string, number> = {}): Record<string, number> | null {
  if (texts.length !== variables.length) return null;
  try {
    const rows = texts.map(text => {
      const parsed = parseExpr(text);
      return parsed.kind === 'eq' ? { kind: 'bin', op: '-', a: parsed.l, b: parsed.r } as Expr : parsed;
    });
    const matrix = rows.map(row => {
      const base = evaluate(row, { ...env, ...Object.fromEntries(variables.map(v => [v, 0])) });
      const coefficients = variables.map(v => evaluate(row, { ...env, ...Object.fromEntries(variables.map(name => [name, name === v ? 1 : 0])) }) - base);
      return [...coefficients, -base];
    });
    for (let col = 0; col < variables.length; col++) {
      let pivot = col;
      for (let row = col + 1; row < matrix.length; row++) if (Math.abs(matrix[row][col]) > Math.abs(matrix[pivot][col])) pivot = row;
      if (Math.abs(matrix[pivot][col]) < 1e-12) return null;
      [matrix[col], matrix[pivot]] = [matrix[pivot], matrix[col]];
      const divisor = matrix[col][col]; matrix[col] = matrix[col].map(v => v / divisor);
      for (let row = 0; row < matrix.length; row++) if (row !== col) {
        const factor = matrix[row][col]; matrix[row] = matrix[row].map((v, k) => v - factor * matrix[col][k]);
      }
    }
    const result = Object.fromEntries(variables.map((v, i) => [v, matrix[i][variables.length]]));
    return Object.values(result).every(v => Number.isFinite(v)) ? result : null;
  } catch {
    return null;
  }
}
