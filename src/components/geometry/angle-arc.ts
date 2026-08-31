import type { AngleObject, Point2 } from '../../math/geometry.ts';

export interface AngleArc { center: Point2; radius: number; start: number; end: number; anticlockwise: boolean }

export function angleArc(angle: AngleObject, radius: number): AngleArc | null {
  const a = Math.atan2(angle.start.y - angle.vertex.y, angle.start.x - angle.vertex.x);
  const b = Math.atan2(angle.end.y - angle.vertex.y, angle.end.x - angle.vertex.x);
  if (!Number.isFinite(a) || !Number.isFinite(b) || radius <= 0) return null;
  let delta = ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  if (angle.reflex) delta = delta > 0 ? delta - Math.PI * 2 : delta + Math.PI * 2;
  return { center: angle.vertex, radius, start: a, end: a + delta, anticlockwise: delta < 0 };
}
