import { type LineObject, type Point2, cross, finitePoint, sub } from './geometry.ts';

export type IntersectionResult =
  | { kind: 'point'; point: Point2; tA: number; tB: number }
  | { kind: 'parallel' | 'coincident' | 'outside' | 'invalid'; reason: string };

const EPSILON = 1e-9;
const inDomain = (kind: LineObject['kind'], t: number, eps: number): boolean =>
  kind === 'line' || (kind === 'ray' ? t >= -eps : t >= -eps && t <= 1 + eps);

/** Intersect two infinite lines, rays, or segments using parametric ranges. */
export function intersect(a: LineObject, b: LineObject, epsilon = EPSILON): IntersectionResult {
  if (![a.a, a.b, b.a, b.b].every(finitePoint)) return { kind: 'invalid', reason: 'Geometry contains a non-finite point.' };
  const scale = Math.max(
    Math.abs(a.a.x), Math.abs(a.a.y), Math.abs(a.b.x), Math.abs(a.b.y),
    Math.abs(b.a.x), Math.abs(b.a.y), Math.abs(b.b.x), Math.abs(b.b.y),
  );
  if (!Number.isFinite(scale) || scale === 0) return { kind: 'invalid', reason: 'Geometry contains no measurable direction.' };
  const normalize = (p: Point2): Point2 => ({ x: p.x / scale, y: p.y / scale });
  const na = normalize(a.a); const nb = normalize(a.b);
  const nc = normalize(b.a); const nd = normalize(b.b);
  const da = sub(nb, na);
  const db = sub(nd, nc);
  // da/db are expressed in normalized coordinates, so the degeneracy
  // threshold must be scale-independent too. Dividing epsilon by the
  // original coordinate magnitude rejects ordinary directions when all
  // coordinates happen to be very small.
  if (Math.hypot(da.x, da.y) <= epsilon || Math.hypot(db.x, db.y) <= epsilon) {
    return { kind: 'invalid', reason: 'Cannot intersect a zero-length geometry.' };
  }
  const denom = cross(da, db);
  if (Math.abs(denom) <= epsilon) {
    const offset = sub(nc, na);
    return Math.abs(cross(offset, da)) <= epsilon
      ? { kind: 'coincident', reason: 'The two geometries lie on the same line.' }
      : { kind: 'parallel', reason: 'The two geometries are parallel.' };
  }
  const offset = sub(nc, na);
  const tA = cross(offset, db) / denom;
  const tB = cross(offset, da) / denom;
  if (!inDomain(a.kind, tA, epsilon) || !inDomain(b.kind, tB, epsilon)) {
    return { kind: 'outside', reason: 'The infinite lines meet outside one of the selected geometries.' };
  }
  const normalizedPoint = { x: na.x + da.x * tA, y: na.y + da.y * tA };
  const point = { x: normalizedPoint.x * scale, y: normalizedPoint.y * scale };
  if (!finitePoint(point)) return { kind: 'outside', reason: 'The intersection is outside the finite coordinate range.' };
  return {
    kind: 'point',
    point,
    tA,
    tB,
  };
}
