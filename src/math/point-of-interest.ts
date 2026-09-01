import { type Expr, evaluate } from './expr.ts';
import type { SpecialPoint } from './special.ts';

export interface Bounds { xlo: number; xhi: number; ylo: number; yhi: number }

const residual = (expr: Expr, x: number, y: number): number => {
  const value = expr.kind === 'eq'
    ? evaluate(expr.l, { x, y }) - evaluate(expr.r, { x, y })
    : evaluate(expr, { x, y });
  return Number.isFinite(value) ? value : NaN;
};

/** Find bounded intersections with a small, deterministic Newton grid.
 * This is deliberately budgeted: it is used from an idle callback, never
 * directly from pointer handling, and returns stable deduplicated candidates.
 */
export function findCurveIntersections(left: Expr, right: Expr, bounds: Bounds, budget = 2048): SpecialPoint[] {
  const out: SpecialPoint[] = [];
  const f = (x: number, y: number) => residual(left, x, y);
  const g = (x: number, y: number) => residual(right, x, y);
  const spanX = bounds.xhi - bounds.xlo, spanY = bounds.yhi - bounds.ylo;
  if (!(spanX > 0 && spanY > 0)) return out;
  const add = (x: number, y: number) => {
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < bounds.xlo || x > bounds.xhi || y < bounds.ylo || y > bounds.yhi) return;
    if (out.some(p => Math.hypot(p.x - x, p.y - y) <= Math.max(spanX, spanY) * 1e-7)) return;
    out.push({ x, y, lines: ['intersection', `(${fmt(x)}, ${fmt(y)})`] });
  };
  const n = Math.max(3, Math.min(16, Math.floor(Math.sqrt(budget / 2))));
  let used = 0;
  for (let ix = 0; ix < n && used < budget; ix++) for (let iy = 0; iy < n && used < budget; iy++) {
    let x = bounds.xlo + (ix + 0.5) * spanX / n;
    let y = bounds.ylo + (iy + 0.5) * spanY / n;
    for (let step = 0; step < 18 && used++ < budget; step++) {
      const a = f(x, y), b = g(x, y);
      if (!Number.isFinite(a) || !Number.isFinite(b)) break;
      const hx = Math.max(1e-7, spanX * 1e-5), hy = Math.max(1e-7, spanY * 1e-5);
      const ax = (f(x + hx, y) - a) / hx, ay = (f(x, y + hy) - a) / hy;
      const bx = (g(x + hx, y) - b) / hx, by = (g(x, y + hy) - b) / hy;
      const det = ax * by - ay * bx;
      let dx: number, dy: number;
      if (Number.isFinite(det) && Math.abs(det) >= 1e-12) {
        dx = (a * by - ay * b) / det;
        dy = (ax * b - a * bx) / det;
      } else {
        // Tangent intersections have parallel/vanishing constraint
        // gradients, so the ordinary Newton determinant is singular. A
        // damped Gauss-Newton step minimizes f² + g² and can converge to
        // roots without a sign change.
        const jxx = ax * ax + bx * bx + 1e-10;
        const jxy = ax * ay + bx * by;
        const jyy = ay * ay + by * by + 1e-10;
        const rhsX = ax * a + bx * b, rhsY = ay * a + by * b;
        const dampDet = jxx * jyy - jxy * jxy;
        if (!Number.isFinite(dampDet) || Math.abs(dampDet) < 1e-20) break;
        dx = (jyy * rhsX - jxy * rhsY) / dampDet;
        dy = (jxx * rhsY - jxy * rhsX) / dampDet;
      }
      if (!Number.isFinite(dx) || !Number.isFinite(dy)) break;
      x -= dx; y -= dy;
      if (Math.hypot(dx / spanX, dy / spanY) < 1e-7 && Math.abs(f(x, y)) < 1e-5 && Math.abs(g(x, y)) < 1e-5) { add(x, y); break; }
      if (x < bounds.xlo - spanX || x > bounds.xhi + spanX || y < bounds.ylo - spanY || y > bounds.yhi + spanY) break;
    }
  }
  return out;
}

function fmt(value: number): string { return String(parseFloat(value.toPrecision(10))); }
