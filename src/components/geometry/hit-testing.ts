import { finitePoint, type GeometryObject, type Point2 } from '../../math/geometry.ts';

const segmentDistance = (p: Point2, a: Point2, b: Point2) => {
  if (!finitePoint(p) || !finitePoint(a) || !finitePoint(b)) return Infinity;
  const scaleFactor = Math.max(Math.abs(p.x), Math.abs(p.y), Math.abs(a.x), Math.abs(a.y), Math.abs(b.x), Math.abs(b.y)) || 1;
  const pn = { x: p.x / scaleFactor, y: p.y / scaleFactor };
  const an = { x: a.x / scaleFactor, y: a.y / scaleFactor };
  const bn = { x: b.x / scaleFactor, y: b.y / scaleFactor };
  const dx = bn.x - an.x, dy = bn.y - an.y, denom = dx * dx + dy * dy;
  const t = denom ? Math.max(0, Math.min(1, ((pn.x - an.x) * dx + (pn.y - an.y) * dy) / denom)) : 0;
  return scaleFactor * Math.hypot(pn.x - (an.x + t * dx), pn.y - (an.y + t * dy));
};

export function geometryDistance(p: Point2, object: GeometryObject): number {
  if (!finitePoint(p)) return Infinity;
  if (object.kind === 'point') return segmentDistance(p, object.point, object.point);
  if (object.kind === 'segment' || object.kind === 'vector') return segmentDistance(p, object.kind === 'vector' ? object.from : object.a, object.kind === 'vector' ? object.to : object.b);
  if (object.kind === 'line' || object.kind === 'ray') {
    if (!finitePoint(object.a) || !finitePoint(object.b)) return Infinity;
    const scaleFactor = Math.max(Math.abs(p.x), Math.abs(p.y), Math.abs(object.a.x), Math.abs(object.a.y), Math.abs(object.b.x), Math.abs(object.b.y)) || 1;
    const pn = { x: p.x / scaleFactor, y: p.y / scaleFactor };
    const an = { x: object.a.x / scaleFactor, y: object.a.y / scaleFactor };
    const bn = { x: object.b.x / scaleFactor, y: object.b.y / scaleFactor };
    const dx = bn.x - an.x, dy = bn.y - an.y;
    const denom = dx * dx + dy * dy;
    if (!denom) return Infinity;
    const t = ((pn.x - an.x) * dx + (pn.y - an.y) * dy) / denom;
    if (object.kind === 'ray' && t < 0) return scaleFactor * Math.hypot(pn.x - an.x, pn.y - an.y);
    return scaleFactor * Math.abs((pn.x - an.x) * dy - (pn.y - an.y) * dx) / Math.sqrt(denom);
  }
  if (object.kind === 'circle') {
    if (!finitePoint(object.center) || !Number.isFinite(object.radius) || object.radius < 0) return Infinity;
    const scaleFactor = Math.max(Math.abs(p.x), Math.abs(p.y), Math.abs(object.center.x), Math.abs(object.center.y), object.radius) || 1;
    const distance = scaleFactor * Math.hypot(
      p.x / scaleFactor - object.center.x / scaleFactor,
      p.y / scaleFactor - object.center.y / scaleFactor,
    );
    return Number.isFinite(distance) ? Math.abs(distance - object.radius) : Infinity;
  }
  if (object.kind === 'polygon') {
    if (object.points.length === 0) return Infinity;
    return Math.min(...object.points.map((a, i) => segmentDistance(p, a, object.points[(i + 1) % object.points.length])));
  }
  if (object.kind === 'angle') return Math.min(segmentDistance(p, object.start, object.vertex), segmentDistance(p, object.vertex, object.end));
  return Infinity;
}
