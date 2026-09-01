import { type Expr, evaluate } from './expr.ts';

export interface SampleBounds { xlo: number; xhi: number; ylo: number; yhi: number }
export interface SampleOptions { columns?: number; seeds?: number; iterations?: number; tolerance?: number }

type Point = [number, number];

const residual = (expr: Expr, x: number, y: number): number => {
  try {
    const value = expr.kind === 'eq'
      ? evaluate(expr.l, { x, y }) - evaluate(expr.r, { x, y })
      : evaluate(expr, { x, y });
    return Number.isFinite(value) ? value : NaN;
  } catch {
    return NaN;
  }
};

/**
 * Sample implicit contours into vector-friendly paths. Multiple Newton seeds
 * per x preserve separate branches (for example both halves of a circle),
 * while invalid/gapped samples are split instead of being joined across a
 * discontinuity. This is intended for export-time work, not animation.
 */
function sampleOrientedContours(expr: Expr, bounds: SampleBounds, options: SampleOptions, vertical: boolean): Point[][] {
  const boundedInt = (value: number | undefined, fallback: number, min: number, max: number): number =>
    Number.isFinite(value) ? Math.min(max, Math.max(min, Math.floor(value!))) : fallback;
  const columns = boundedInt(options.columns, 640, 8, 4096);
  const seeds = boundedInt(options.seeds, 10, 3, 64);
  const iterations = boundedInt(options.iterations, 16, 4, 64);
  const tolerance = Number.isFinite(options.tolerance) && options.tolerance! >= 0 ? options.tolerance! : 1e-5;
  if (![bounds.xlo, bounds.xhi, bounds.ylo, bounds.yhi].every(Number.isFinite)) return [];
  const primaryLo = vertical ? bounds.ylo : bounds.xlo;
  const primaryHi = vertical ? bounds.yhi : bounds.xhi;
  const rootLo = vertical ? bounds.xlo : bounds.ylo;
  const rootHi = vertical ? bounds.xhi : bounds.yhi;
  const primarySpan = primaryHi - primaryLo;
  const rootSpan = rootHi - rootLo;
  if (!(primarySpan > 0 && rootSpan > 0)) return [];

  const tracks: Array<{ points: Point[]; lastRoot: number; column: number }> = [];
  const maxJoin = Math.max(rootSpan / seeds * 2.5, rootSpan / columns * 8);
  for (let column = 0; column < columns; column++) {
    const primary = primaryLo + (column / (columns - 1)) * primarySpan;
    const roots: number[] = [];
    const h = Math.max(rootSpan * 1e-5, 1e-7);
    for (let seed = 0; seed < seeds; seed++) {
      let root = rootLo + ((seed + 0.5) / seeds) * rootSpan;
      let converged = false;
      for (let step = 0; step < iterations; step++) {
        const f = vertical ? residual(expr, root, primary) : residual(expr, primary, root);
        if (!Number.isFinite(f)) break;
        const next = vertical ? residual(expr, root + h, primary) : residual(expr, primary, root + h);
        const derivative = (next - f) / h;
        if (!Number.isFinite(derivative) || Math.abs(derivative) < 1e-12) break;
        const delta = f / derivative;
        if (!Number.isFinite(delta) || Math.abs(delta) > rootSpan * 2) break;
        root -= delta;
        if (root < rootLo - rootSpan * 0.02 || root > rootHi + rootSpan * 0.02) break;
        if (Math.abs(vertical ? residual(expr, root, primary) : residual(expr, primary, root)) <= tolerance) { converged = true; break; }
      }
      const clamped = Math.min(rootHi, Math.max(rootLo, root));
      if (converged && root >= rootLo - tolerance * 4 && root <= rootHi + tolerance * 4
        && roots.every(existing => Math.abs(existing - clamped) > maxJoin * 0.35)) roots.push(clamped);
    }
    roots.sort((a, b) => a - b);
    const used = new Set<number>();
    for (const root of roots) {
      let best = -1; let distance = Infinity;
      tracks.forEach((track, index) => {
        if (used.has(index) || track.column !== column - 1) return;
        const d = Math.abs(track.lastRoot - root);
        if (d < distance && d <= maxJoin) { best = index; distance = d; }
      });
      if (best < 0) {
        tracks.push({ points: [vertical ? [root, primary] : [primary, root]], lastRoot: root, column });
        used.add(tracks.length - 1);
      } else {
        const track = tracks[best];
        track.points.push(vertical ? [root, primary] : [primary, root]); track.lastRoot = root; track.column = column; used.add(best);
      }
    }
  }
  return tracks.filter(track => track.points.length >= 2).map(track => track.points);
}

export function sampleImplicitContours(expr: Expr, bounds: SampleBounds, options: SampleOptions = {}): Point[][] {
  return sampleOrientedContours(expr, bounds, options, false);
}

/** Sample contours whose tangent is vertical, such as `x = 1`. */
export function sampleImplicitVerticalContours(expr: Expr, bounds: SampleBounds, options: SampleOptions = {}): Point[][] {
  return sampleOrientedContours(expr, bounds, options, true);
}
