/** Typed, numeric geometry values shared by analysis and browser overlays. */

export interface Point2 { x: number; y: number }
export type Vector2 = Point2;

export interface PointObject { kind: 'point'; point: Point2; label?: string }
export interface LineObject { kind: 'line' | 'ray' | 'segment'; a: Point2; b: Point2; label?: string }
export interface CircleObject { kind: 'circle'; center: Point2; radius: number; label?: string }
export interface PolygonObject { kind: 'polygon'; points: Point2[]; label?: string }
export interface VectorObject { kind: 'vector'; from: Point2; to: Point2; label?: string }
export interface AngleObject {
  kind: 'angle';
  start: Point2;
  vertex: Point2;
  end: Point2;
  reflex?: boolean;
  label?: string;
}

export type GeometryObject =
  | PointObject | LineObject | CircleObject | PolygonObject | VectorObject | AngleObject;

export const point = (x: number, y: number, label?: string): PointObject => ({ kind: 'point', point: { x, y }, label });
export const line = (a: Point2, b: Point2, label?: string): LineObject => ({ kind: 'line', a, b, label });
export const ray = (a: Point2, b: Point2, label?: string): LineObject => ({ kind: 'ray', a, b, label });
export const segment = (a: Point2, b: Point2, label?: string): LineObject => ({ kind: 'segment', a, b, label });
export const vector = (from: Point2, to: Point2, label?: string): VectorObject => ({ kind: 'vector', from, to, label });
export const circle = (center: Point2, radius: number, label?: string): CircleObject => ({ kind: 'circle', center, radius, label });
export const polygon = (points: Point2[], label?: string): PolygonObject => ({ kind: 'polygon', points, label });
export const angle = (start: Point2, vertex: Point2, end: Point2, reflex = false, label?: string): AngleObject =>
  ({ kind: 'angle', start, vertex, end, reflex, label });

export const finitePoint = (p: Point2): boolean => Number.isFinite(p.x) && Number.isFinite(p.y);
export const sub = (a: Point2, b: Point2): Vector2 => ({ x: a.x - b.x, y: a.y - b.y });
export const add = (a: Point2, b: Point2): Point2 => ({ x: a.x + b.x, y: a.y + b.y });
export const scale = (a: Point2, n: number): Point2 => ({ x: a.x * n, y: a.y * n });
export const dot = (a: Point2, b: Point2): number => a.x * b.x + a.y * b.y;
export const cross = (a: Point2, b: Point2): number => a.x * b.y - a.y * b.x;
export const length = (a: Point2): number => Math.hypot(a.x, a.y);
