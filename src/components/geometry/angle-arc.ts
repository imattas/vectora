import type { AngleObject, Point2 } from '../../math/geometry.ts';

export interface AngleArc { center: Point2; radius: number; start: number; end: number; anticlockwise: boolean }

export function angleArc(angle: AngleObject, radius: number): AngleArc | null {
  const scale = Math.max(
    Math.abs(angle.start.x), Math.abs(angle.start.y), Math.abs(angle.vertex.x), Math.abs(angle.vertex.y),
    Math.abs(angle.end.x), Math.abs(angle.end.y),
  ) || 1;
  const a = Math.atan2(angle.start.y / scale - angle.vertex.y / scale, angle.start.x / scale - angle.vertex.x / scale);
  const b = Math.atan2(angle.end.y / scale - angle.vertex.y / scale, angle.end.x / scale - angle.vertex.x / scale);
  if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(radius) || radius <= 0) return null;
  let delta = ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  if (angle.reflex) delta = delta > 0 ? delta - Math.PI * 2 : delta + Math.PI * 2;
  return { center: angle.vertex, radius, start: a, end: a + delta, anticlockwise: delta < 0 };
}
