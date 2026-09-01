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
export function sampleImplicitContours(expr: Expr, bounds: SampleBounds, options: SampleOptions = {}): Point[][] {
  const columns = Math.max(8, Math.floor(options.columns ?? 640));
  const seeds = Math.max(3, Math.floor(options.seeds ?? 10));
  const iterations = Math.max(4, Math.floor(options.iterations ?? 16));
  const tolerance = options.tolerance ?? 1e-5;
  const spanX = bounds.xhi - bounds.xlo;
  const spanY = bounds.yhi - bounds.ylo;
  if (!(spanX > 0 && spanY > 0)) return [];

  const tracks: Array<{ points: Point[]; lastY: number; column: number }> = [];
  const maxJoin = Math.max(spanY / seeds * 2.5, spanY / columns * 8);
  for (let column = 0; column < columns; column++) {
    const x = bounds.xlo + (column / (columns - 1)) * spanX;
    const roots: number[] = [];
    const hy = Math.max(spanY * 1e-5, 1e-7);
    for (let seed = 0; seed < seeds; seed++) {
      let y = bounds.ylo + ((seed + 0.5) / seeds) * spanY;
      let converged = false;
      for (let step = 0; step < iterations; step++) {
        const f = residual(expr, x, y);
        if (!Number.isFinite(f)) break;
        const fy = (residual(expr, x, y + hy) - f) / hy;
        if (!Number.isFinite(fy) || Math.abs(fy) < 1e-12) break;
        const delta = f / fy;
        if (!Number.isFinite(delta) || Math.abs(delta) > spanY * 2) break;
        y -= delta;
        if (y < bounds.ylo - spanY * 0.02 || y > bounds.yhi + spanY * 0.02) break;
        if (Math.abs(residual(expr, x, y)) <= tolerance) { converged = true; break; }
      }
      const clamped = Math.min(bounds.yhi, Math.max(bounds.ylo, y));
      if (converged && y >= bounds.ylo - tolerance * 4 && y <= bounds.yhi + tolerance * 4
        && roots.every(root => Math.abs(root - clamped) > maxJoin * 0.35)) roots.push(clamped);
    }
    roots.sort((a, b) => a - b);
    const used = new Set<number>();
    for (const y of roots) {
      let best = -1; let distance = Infinity;
      tracks.forEach((track, index) => {
        if (used.has(index) || track.column !== column - 1) return;
        const d = Math.abs(track.lastY - y);
        if (d < distance && d <= maxJoin) { best = index; distance = d; }
      });
      if (best < 0) {
        tracks.push({ points: [[x, y]], lastY: y, column });
        used.add(tracks.length - 1);
      } else {
        const track = tracks[best];
        track.points.push([x, y]); track.lastY = y; track.column = column; used.add(best);
      }
    }
  }
  return tracks.filter(track => track.points.length >= 2).map(track => track.points);
}
