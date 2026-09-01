import type { GeometryAnalysis } from '../../math/geometry-analysis.ts';
import type { GeometryObject, Point2 } from '../../math/geometry.ts';
import { measureAngle } from '../../math/measurements.ts';
import { angleArc } from './angle-arc.ts';

export interface GeometryOverlayOptions {
  hover?: GeometryObject | null;
  pinned?: GeometryObject | null;
  colorFor?: (object: GeometryObject) => string;
  hoverPoint?: Point2 | null;
  angleUnit?: 'degrees' | 'radians';
}

const color = '#56b4ff';
const toScreen = (ctx: CanvasRenderingContext2D, view: { cx: number; cy: number; upp: number }, dpr: number, p: Point2) => {
  const w = ctx.canvas.width / dpr, h = ctx.canvas.height / dpr;
  const upp = view.upp * dpr;
  return { x: (p.x - view.cx) / upp + w / 2, y: h / 2 - (p.y - view.cy) / upp };
};

function drawLine(ctx: CanvasRenderingContext2D, view: { cx: number; cy: number; upp: number }, dpr: number, object: Extract<GeometryObject, { kind: 'line' | 'ray' | 'segment' }>) {
  const w = ctx.canvas.width / dpr, h = ctx.canvas.height / dpr;
  const halfW = w * view.upp * dpr / 2, halfH = h * view.upp * dpr / 2;
  const dx = object.b.x - object.a.x, dy = object.b.y - object.a.y;
  const length = Math.hypot(dx, dy);
  if (!length) return;
  const ux = dx / length, uy = dy / length;
  let from = 0, to = 0;
  if (object.kind === 'line') { from = -Math.max(halfW, halfH) * 2; to = -from; }
  else if (object.kind === 'ray') { from = 0; to = Math.max(halfW, halfH) * 2; }
  else { from = 0; to = length; }
  const a = toScreen(ctx, view, dpr, { x: object.a.x + ux * from, y: object.a.y + uy * from });
  const b = toScreen(ctx, view, dpr, { x: object.a.x + ux * to, y: object.a.y + uy * to });
  ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
}

export function drawGeometryOverlay(ctx: CanvasRenderingContext2D, view: { cx: number; cy: number; upp: number }, dpr: number, analysis: GeometryAnalysis, options: GeometryOverlayOptions = {}) {
  const w = ctx.canvas.width / dpr, h = ctx.canvas.height / dpr;
  ctx.save(); ctx.scale(dpr, dpr); ctx.lineCap = 'round';
  const objects = [...analysis.objects, ...analysis.derived];
  for (const object of objects) {
    ctx.beginPath(); ctx.strokeStyle = object === options.hover ? '#fff' : (options.colorFor?.(object) ?? color);
    ctx.lineWidth = object === options.hover ? 3 : 1.75;
    if (object.kind === 'line' || object.kind === 'ray' || object.kind === 'segment') drawLine(ctx, view, dpr, object);
    else if (object.kind === 'polygon') {
      object.points.forEach((p, i) => { const s = toScreen(ctx, view, dpr, p); i ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y); });
      ctx.closePath();
    } else if (object.kind === 'vector') {
      const a = toScreen(ctx, view, dpr, object.from), b = toScreen(ctx, view, dpr, object.to);
      ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
    } else if (object.kind === 'circle') {
      const c = toScreen(ctx, view, dpr, object.center);
      ctx.arc(c.x, c.y, object.radius / (view.upp * dpr), 0, Math.PI * 2);
    }
    if (object.kind !== 'point' && object.kind !== 'angle') ctx.stroke();
    if (object.kind === 'angle') {
      const radius = Math.max(14, Math.min(38, Math.min(w, h) * 0.08));
      const arc = angleArc(object, 1);
      if (arc) {
        const c = toScreen(ctx, view, dpr, arc.center);
        // angleArc uses mathematical (+y-up) angles; canvas uses (+y-down).
        // Negating both endpoints keeps the arch on the same side as the two
        // rays, while reversing the direction preserves the smaller/reflex
        // choice. The endpoints therefore land directly on the source lines.
        const start = -arc.start;
        const end = -arc.end;
        ctx.beginPath();
        ctx.arc(c.x, c.y, radius, start, end, !arc.anticlockwise);
        ctx.stroke();
        // A short cap at each endpoint makes contact remain visible after
        // antialiasing and fractional zoom, even when the source ray is thin.
        for (const a of [start, end]) {
          ctx.beginPath(); ctx.arc(c.x + radius * Math.cos(a), c.y + radius * Math.sin(a), 1.5, 0, Math.PI * 2); ctx.fillStyle = ctx.strokeStyle; ctx.fill();
        }
        if (object.label === 'intersection-angle') {
          const measurement = measureAngle(object);
          const middle = (start + end) / 2;
          if (measurement.ok) {
            ctx.font = '11px ui-sans-serif, system-ui'; ctx.fillStyle = ctx.strokeStyle;
            const label = options.angleUnit === 'radians' ? `${measurement.value.radians} rad` : `${measurement.value.degrees}°`;
            ctx.fillText(label, c.x + (radius + 7) * Math.cos(middle), c.y + (radius + 7) * Math.sin(middle));
          }
        }
      }
    }
  }
  const readoutObject = options.pinned ?? options.hover;
  if (readoutObject) {
    const p = readoutObject.kind === 'point' ? readoutObject.point : readoutObject.kind === 'angle' ? readoutObject.vertex : options.hoverPoint ?? null;
    const row = [...analysis.byRow.entries()].find(([, values]) => values.includes(readoutObject))?.[0];
    const readout = row === undefined ? undefined : analysis.readouts.get(row);
    if (p && readout) { const s = toScreen(ctx, view, dpr, p); ctx.font = '12px ui-sans-serif, system-ui'; ctx.fillStyle = '#f5f7fb'; ctx.fillText(readout, Math.min(w - 150, s.x + 12), Math.max(16, s.y - 12)); }
  }
  ctx.restore();
}
