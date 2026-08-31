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

const valid = (...ps: Point2[]): boolean => ps.every(finitePoint);

export function distance(a: Point2, b: Point2): MeasurementResult<number> {
  return valid(a, b) ? { ok: true, value: Math.hypot(b.x - a.x, b.y - a.y) } : { ok: false, reason: 'Distance has a non-finite endpoint.' };
}

export function midpoint(a: Point2, b: Point2): MeasurementResult<Point2> {
  return valid(a, b) ? { ok: true, value: scale(add(a, b), 0.5) } : { ok: false, reason: 'Midpoint has a non-finite endpoint.' };
}

export function projection(point: Point2, a: Point2, b: Point2): MeasurementResult<Point2> {
  if (!valid(point, a, b)) return { ok: false, reason: 'Projection has a non-finite point.' };
  const d = sub(b, a);
  const denom = dot(d, d);
  if (denom <= 1e-18) return { ok: false, reason: 'Cannot project onto a zero-length line.' };
  return { ok: true, value: add(a, scale(d, dot(sub(point, a), d) / denom)) };
}

export function measureAngle(value: AngleObject): MeasurementResult<AngleMeasurement> {
  const { start, vertex, end } = value;
  if (!valid(start, vertex, end)) return { ok: false, reason: 'Angle has a non-finite point.' };
  const u = sub(start, vertex);
  const v = sub(end, vertex);
  const lu = length(u);
  const lv = length(v);
  if (lu <= 1e-12 || lv <= 1e-12) return { ok: false, reason: 'An angle needs two non-zero rays.' };
  const small = Math.atan2(Math.abs(cross(u, v)), dot(u, v));
  const reflex = !!value.reflex;
  const radians = reflex ? Math.PI * 2 - small : small;
  return { ok: true, value: { radians, degrees: radians * 180 / Math.PI, reflex, vertex, start, end } };
}

export const formatMeasurement = (value: number, digits = 4): string => {
  if (!Number.isFinite(value)) return 'undefined';
  const rounded = Number(value.toFixed(digits));
  return String(rounded);
};
