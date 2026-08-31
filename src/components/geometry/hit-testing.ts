import type { GeometryObject, Point2 } from '../../math/geometry.ts';

const segmentDistance = (p: Point2, a: Point2, b: Point2) => {
  const dx = b.x - a.x, dy = b.y - a.y, denom = dx * dx + dy * dy;
  const t = denom ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / denom)) : 0;
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
};

export function geometryDistance(p: Point2, object: GeometryObject): number {
  if (object.kind === 'point') return Math.hypot(p.x - object.point.x, p.y - object.point.y);
  if (object.kind === 'segment' || object.kind === 'vector') return segmentDistance(p, object.kind === 'vector' ? object.from : object.a, object.kind === 'vector' ? object.to : object.b);
  if (object.kind === 'line' || object.kind === 'ray') {
    const dx = object.b.x - object.a.x, dy = object.b.y - object.a.y;
    const denom = dx * dx + dy * dy;
    if (!denom) return Infinity;
    const t = ((p.x - object.a.x) * dx + (p.y - object.a.y) * dy) / denom;
    if (object.kind === 'ray' && t < 0) return Math.hypot(p.x - object.a.x, p.y - object.a.y);
    return Math.abs((p.x - object.a.x) * dy - (p.y - object.a.y) * dx) / Math.sqrt(denom);
  }
  if (object.kind === 'circle') return Math.abs(Math.hypot(p.x - object.center.x, p.y - object.center.y) - object.radius);
  if (object.kind === 'polygon') {
    if (object.points.length === 0) return Infinity;
    return Math.min(...object.points.map((a, i) => segmentDistance(p, a, object.points[(i + 1) % object.points.length])));
  }
  if (object.kind === 'angle') return Math.min(segmentDistance(p, object.start, object.vertex), segmentDistance(p, object.vertex, object.end));
  return Infinity;
}
