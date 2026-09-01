import { type AngleObject, type Point2, add, cross, dot, finitePoint, length, scale, sub } from './geometry.ts';

export type MeasurementResult<T> = { ok: true; value: T } | { ok: false; reason: string };
export interface AngleMeasurement {
  radians: number;
  degrees: number;
  reflex: boolean;
  vertex: Point2;
  start: Point2;
  end: Point2;
}

const valid = (...ps: Point2[]): boolean => ps.every(point =>
  point !== null && typeof point === 'object' && finitePoint(point));

export function distance(a: Point2, b: Point2): MeasurementResult<number> {
  if (!valid(a, b)) return { ok: false, reason: 'Distance has a non-finite endpoint.' };
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const value = Number.isFinite(dx) && Number.isFinite(dy)
    ? Math.hypot(dx, dy)
    : (() => {
      const scaleFactor = Math.max(Math.abs(a.x), Math.abs(a.y), Math.abs(b.x), Math.abs(b.y)) || 1;
      return scaleFactor * Math.hypot(b.x / scaleFactor - a.x / scaleFactor, b.y / scaleFactor - a.y / scaleFactor);
    })();
  return Number.isFinite(value) ? { ok: true, value } : { ok: false, reason: 'Distance is non-finite.' };
}

export function midpoint(a: Point2, b: Point2): MeasurementResult<Point2> {
  if (!valid(a, b)) return { ok: false, reason: 'Midpoint has a non-finite endpoint.' };
  const value = { x: a.x / 2 + b.x / 2, y: a.y / 2 + b.y / 2 };
  return finitePoint(value) ? { ok: true, value } : { ok: false, reason: 'Midpoint is non-finite.' };
}

export function projection(point: Point2, a: Point2, b: Point2): MeasurementResult<Point2> {
  if (!valid(point, a, b)) return { ok: false, reason: 'Projection has a non-finite point.' };
  const magnitude = Math.max(Math.abs(point.x), Math.abs(point.y), Math.abs(a.x), Math.abs(a.y), Math.abs(b.x), Math.abs(b.y));
  const scaleFactor = magnitude || 1;
  const pa = { x: point.x / scaleFactor, y: point.y / scaleFactor };
  const aa = { x: a.x / scaleFactor, y: a.y / scaleFactor };
  const bb = { x: b.x / scaleFactor, y: b.y / scaleFactor };
  const d = sub(bb, aa);
  const denom = dot(d, d);
  if (denom <= 1e-18) return { ok: false, reason: 'Cannot project onto a zero-length line.' };
  const value = scale(add(aa, scale(d, dot(sub(pa, aa), d) / denom)), scaleFactor);
  return finitePoint(value) ? { ok: true, value } : { ok: false, reason: 'Projection is non-finite.' };
}

export function measureAngle(value: AngleObject): MeasurementResult<AngleMeasurement> {
  const { start, vertex, end } = value;
  if (!valid(start, vertex, end)) return { ok: false, reason: 'Angle has a non-finite point.' };
  // Normalize coordinates before subtracting so opposite finite extremes do
  // not overflow to Infinity while their direction is still representable.
  const scaleFactor = Math.max(
    Math.abs(start.x), Math.abs(start.y), Math.abs(vertex.x), Math.abs(vertex.y),
    Math.abs(end.x), Math.abs(end.y),
  ) || 1;
  const u = sub(
    { x: start.x / scaleFactor, y: start.y / scaleFactor },
    { x: vertex.x / scaleFactor, y: vertex.y / scaleFactor },
  );
  const v = sub(
    { x: end.x / scaleFactor, y: end.y / scaleFactor },
    { x: vertex.x / scaleFactor, y: vertex.y / scaleFactor },
  );
  const lu = length(u);
  const lv = length(v);
  if (!(lu > 0) || !(lv > 0)) return { ok: false, reason: 'An angle needs two non-zero rays.' };
  const un = scale(u, 1 / lu);
  const vn = scale(v, 1 / lv);
  const small = Math.atan2(Math.abs(cross(un, vn)), dot(un, vn));
  const reflex = !!value.reflex;
  const radians = reflex ? Math.PI * 2 - small : small;
  return { ok: true, value: { radians, degrees: radians * 180 / Math.PI, reflex, vertex, start, end } };
}

export const formatMeasurement = (value: number, digits = 4): string => {
  if (!Number.isFinite(value)) return 'undefined';
  const places = Number.isFinite(digits) ? Math.min(20, Math.max(0, Math.trunc(digits))) : 4;
  const rounded = Number(value.toFixed(places));
  return String(rounded);
};
