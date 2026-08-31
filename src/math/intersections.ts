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
  const da = sub(a.b, a.a);
  const db = sub(b.b, b.a);
  const denom = cross(da, db);
  if (Math.abs(denom) <= epsilon) {
    const offset = sub(b.a, a.a);
    return Math.abs(cross(offset, da)) <= epsilon
      ? { kind: 'coincident', reason: 'The two geometries lie on the same line.' }
      : { kind: 'parallel', reason: 'The two geometries are parallel.' };
  }
  const offset = sub(b.a, a.a);
  const tA = cross(offset, db) / denom;
  const tB = cross(offset, da) / denom;
  if (!inDomain(a.kind, tA, epsilon) || !inDomain(b.kind, tB, epsilon)) {
    return { kind: 'outside', reason: 'The infinite lines meet outside one of the selected geometries.' };
  }
  return {
    kind: 'point',
    point: { x: a.a.x + da.x * tA, y: a.a.y + da.y * tA },
    tA,
    tB,
  };
}
