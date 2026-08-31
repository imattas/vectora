import { parseExpr, type Expr, evaluate } from './expr.ts';
import { angle, circle, line, point, polygon, ray, segment, type GeometryObject, type Point2 } from './geometry.ts';
import { intersect } from './intersections.ts';
import { distance as pointDistance, measureAngle, midpoint, projection } from './measurements.ts';

export interface GeometryRow { row: number; text: string }
export interface GeometryUnavailable { row: number; reason: string }
export interface GeometryAnalysis {
  objects: GeometryObject[];
  derived: GeometryObject[];
  byRow: Map<number, GeometryObject[]>;
  dependencies: Map<number, number[]>;
  unavailable: GeometryUnavailable[];
  readouts: Map<number, string>;
}

export const ANALYSIS_ONLY_FORMS = new Set(['ray', 'angle', 'intersection', 'distance', 'midpoint', 'parallel', 'perpendicular', 'projection', 'circle', 'polygon', 'square']);

type Value = Point2 | GeometryObject;
const isPoint = (v: Value): v is Point2 => 'x' in v && 'y' in v;
const isLine = (v: Value): v is Extract<GeometryObject, { kind: 'line' | 'ray' | 'segment' }> =>
  !isPoint(v) && (v.kind === 'line' || v.kind === 'ray' || v.kind === 'segment');

const scalar = (e: Expr, env: ReadonlyMap<string, number>): number => {
  const vars: Record<string, number> = {};
  for (const [name, value] of env) vars[name] = value;
  return evaluate(e, vars);
};

export function analyzeGeometry(
  rows: readonly GeometryRow[],
  points: ReadonlyMap<string, Point2> = new Map(),
  env: ReadonlyMap<string, number> = new Map(),
): GeometryAnalysis {
  const objects: GeometryObject[] = [];
  const derived: GeometryObject[] = [];
  const byRow = new Map<number, GeometryObject[]>();
  const dependencies = new Map<number, number[]>();
  const unavailable: GeometryUnavailable[] = [];
  const readouts = new Map<number, string>();
  const values = new Map<string, Point2>(points);
  const pointRows = new Map<string, number>();
  const dependencyRows = (e: Expr): number[] => {
    const found = new Set<number>();
    const walk = (node: Expr) => {
      if (node.kind === 'var') {
        const row = pointRows.get(node.name);
        if (row !== undefined) found.add(row);
      } else if (node.kind === 'call') node.args.forEach(walk);
      else if (node.kind === 'bin') { walk(node.a); walk(node.b); }
      else if (node.kind === 'neg') walk(node.a);
      else if (node.kind === 'vec' || node.kind === 'list') node.items.forEach(walk);
      else if (node.kind === 'eq' || node.kind === 'ineq') { walk(node.l); walk(node.r); }
    };
    walk(e);
    return [...found].sort((a, b) => a - b);
  };

  const resolvePoint = (e: Expr): Point2 => {
    if (e.kind === 'var') {
      const p = values.get(e.name);
      if (!p) throw new Error(`${e.name} is not a defined point.`);
      return p;
    }
    if (e.kind === 'vec' && e.items.length === 2) {
      const p = { x: scalar(e.items[0], env), y: scalar(e.items[1], env) };
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) throw new Error('Point is not finite.');
      return p;
    }
    throw new Error('Expected a named or literal 2D point.');
  };
  const pointArgs = (args: Expr[]): Expr[] => {
    const out: Expr[] = [];
    for (let i = 0; i < args.length; i++) {
      if (args[i].kind === 'var' || args[i].kind === 'vec') out.push(args[i]);
      else if (args[i + 1]) { out.push({ kind: 'vec', items: [args[i], args[++i]] }); }
      else throw new Error('Expected a complete 2D point.');
    }
    return out;
  };
  const resolveValue = (e: Expr): Value => {
    if (e.kind === 'call') {
      if (e.name === 'line' || e.name === 'ray' || e.name === 'segment') {
        const args = pointArgs(e.args);
        if (args.length !== 2) throw new Error(`${e.name} takes two points.`);
        const a = resolvePoint(args[0]); const b = resolvePoint(args[1]);
        return e.name === 'line' ? line(a, b) : e.name === 'ray' ? ray(a, b) : segment(a, b);
      }
      if (e.name === 'midpoint') {
        const args = pointArgs(e.args);
        if (args.length !== 2) throw new Error('midpoint takes two points.');
        const result = midpoint(resolvePoint(args[0]), resolvePoint(args[1]));
        if (!result.ok) throw new Error(result.reason);
        return result.value;
      }
      if (e.name === 'circle') {
        // The expression parser flattens `(x, y)` when it appears as a call
        // argument, so `circle((0, 0), 2)` arrives as `(0, 0, 2)` here.
        // Normalize point arguments before validating the circle signature.
        if (e.args.length < 2) throw new Error('circle takes a center point and radius.');
        const args: Expr[] = [...pointArgs(e.args.slice(0, -1)), e.args[e.args.length - 1]];
        if (args.length !== 2) throw new Error('circle takes a center point and radius.');
        const center = resolvePoint(args[0]);
        const radius = scalar(args[1], env);
        if (!Number.isFinite(radius) || radius <= 0) throw new Error('Circle radius must be positive.');
        return circle(center, radius);
      }
      if (e.name === 'polygon' || e.name === 'square') {
        const args = pointArgs(e.args);
        if (e.name === 'square') {
          if (args.length !== 2) throw new Error('square takes two points.');
          const a = resolvePoint(args[0]);
          const b = resolvePoint(args[1]);
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          // Match the parser's square(A, B) lowering: erect the square to
          // the left of A -> B so the overlay and the GPU plot agree.
          return polygon([
            a,
            b,
            { x: b.x - dy, y: b.y + dx },
            { x: a.x - dy, y: a.y + dx },
          ]);
        }
        if (args.length < 3) throw new Error('polygon needs at least three points.');
        return polygon(args.map(resolvePoint));
      }
      if (e.name === 'intersection') {
        if (e.args.length !== 2) throw new Error('intersection takes two line-like objects.');
        const a = resolveValue(e.args[0]); const b = resolveValue(e.args[1]);
        if (!isLine(a) || !isLine(b)) throw new Error('intersection needs two line-like objects.');
        const result = intersect(a, b);
        if (result.kind !== 'point') throw new Error(result.reason);
        return result.point;
      }
      if (e.name === 'parallel' || e.name === 'perpendicular') {
        const args = pointArgs(e.args);
        if (args.length !== 3) throw new Error(`${e.name} takes two direction points and a through point.`);
        const a = resolvePoint(args[0]); const b = resolvePoint(args[1]); const through = resolvePoint(args[2]);
        const d = { x: b.x - a.x, y: b.y - a.y };
        const end = e.name === 'parallel'
          ? { x: through.x + d.x, y: through.y + d.y }
          : { x: through.x - d.y, y: through.y + d.x };
        return line(through, end);
      }
    }
    return resolvePoint(e);
  };
  const push = (row: number, object: GeometryObject, deps: number[]) => {
    objects.push(object); byRow.set(row, [...(byRow.get(row) ?? []), object]); dependencies.set(row, deps);
  };

  for (const { row, text } of rows) {
    const trimmed = text.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    try {
      const parsed = parseExpr(trimmed);
      if (parsed.kind === 'eq' && parsed.l.kind === 'var') {
        if (parsed.r.kind === 'vec' && parsed.r.items.length === 2) {
          const p = resolvePoint(parsed.r);
          values.set(parsed.l.name, p); pointRows.set(parsed.l.name, row);
          push(row, point(p.x, p.y, parsed.l.name), []);
          continue;
        }
        if (parsed.r.kind === 'call') {
          const value = resolveValue(parsed.r);
          if (isPoint(value)) { values.set(parsed.l.name, value); pointRows.set(parsed.l.name, row); }
          const object = isPoint(value)
            ? point(value.x, value.y, parsed.l.name)
            : { ...value, label: parsed.l.name };
          push(row, object, dependencyRows(parsed.r));
          if (isPoint(value)) derived.push(object);
          continue;
        }
      }
      if (parsed.kind !== 'call') continue;
      const deps = dependencyRows(parsed);
      let object: GeometryObject;
      if (parsed.name === 'angle') {
        const args = pointArgs(parsed.args);
        if (args.length !== 3) throw new Error('angle takes angle(start, vertex, end).');
        object = angle(resolvePoint(args[0]), resolvePoint(args[1]), resolvePoint(args[2]), false, `angle${row + 1}`);
        const m = measureAngle(object); if (!m.ok) throw new Error(m.reason);
      } else if (parsed.name === 'distance') {
        const args = pointArgs(parsed.args);
        if (args.length !== 2) throw new Error('distance takes two points.');
        const a = resolvePoint(args[0]); const b = resolvePoint(args[1]);
        const value = pointDistance(a, b); if (!value.ok) throw new Error(value.reason);
        object = segment(a, b, `distance${row + 1}`);
        readouts.set(row, `${value.value}`);
      } else if (parsed.name === 'projection') {
        const args = pointArgs(parsed.args);
        if (args.length !== 3) throw new Error('projection takes a point and two line endpoints.');
        const p = projection(resolvePoint(args[0]), resolvePoint(args[1]), resolvePoint(args[2]));
        if (!p.ok) throw new Error(p.reason);
        object = point(p.value.x, p.value.y, `projection${row + 1}`);
      } else {
        const value = resolveValue(parsed);
        object = isPoint(value) ? point(value.x, value.y, `${parsed.name}${row + 1}`) : { ...value, label: `${parsed.name}${row + 1}` };
      }
      push(row, object, deps);
      if (object.kind === 'angle') {
        const m = measureAngle(object); if (m.ok) readouts.set(row, `${m.value.degrees}° (${m.value.radians} rad)`);
      } else if (object.kind === 'point') readouts.set(row, `(${object.point.x}, ${object.point.y})`);
      else if (object.kind === 'segment' || object.kind === 'ray' || object.kind === 'line') {
        const dx = object.b.x - object.a.x, dy = object.b.y - object.a.y;
        const length = Math.hypot(dx, dy);
        readouts.set(row, object.label?.startsWith('distance') ? `${length}` : `direction (${dx}, ${dy}), length ${length}`);
      } else if (object.kind === 'circle') {
        readouts.set(row, `center (${object.center.x}, ${object.center.y}), radius ${object.radius}, area ${Math.PI * object.radius ** 2}`);
      } else if (object.kind === 'polygon') {
        const perimeter = object.points.reduce((sum, p, i) => {
          const q = object.points[(i + 1) % object.points.length];
          return sum + Math.hypot(q.x - p.x, q.y - p.y);
        }, 0);
        readouts.set(row, `vertices ${object.points.length}, perimeter ${perimeter}`);
      }
      if (object.kind === 'point') derived.push(object);
    } catch (error) {
      unavailable.push({ row, reason: error instanceof Error ? error.message : String(error) });
    }
  }
  return { objects, derived, byRow, dependencies, unavailable, readouts };
}
