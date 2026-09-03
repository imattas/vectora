/**
 * Boundary between Vectora's compact parser syntax and MathLive's LaTeX
 * value. MathLive owns editing and cursor movement; Vectora keeps its stable
 * URL/parser representation.
 */

const FUNCTION_NAMES = new Set([
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2', 'sinh', 'cosh', 'tanh',
  'ln', 'log', 'log10', 'exp', 'floor', 'ceil', 'round', 'abs', 'sqrt', 'cbrt',
]);

const escapeLatexText = (text: string): string => text
  .replaceAll('\\', '\\backslash ')
  .replaceAll('{', '\\{').replaceAll('}', '\\}')
  .replaceAll('_', '\\_');

function readBalanced(text: string, open: number): { body: string; end: number } | null {
  if (text[open] !== '{') return null;
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}' && --depth === 0) return { body: text.slice(open + 1, i), end: i + 1 };
  }
  return null;
}

function readLatexGroup(text: string, start: number): { body: string; end: number } | null {
  if (text[start] === '{') return readBalanced(text, start);
  if (text[start] === '(') {
    let depth = 0;
    for (let i = start; i < text.length; i++) {
      if (text[i] === '(') depth++;
      else if (text[i] === ')' && --depth === 0) return { body: text.slice(start + 1, i), end: i + 1 };
    }
  }
  return null;
}

/** Convert the parser's function syntax into the LaTeX accepted by MathLive. */
export function vectoraToLatex(text: string): string {
  let out = '';
  for (let i = 0; i < text.length;) {
    const rest = text.slice(i);
    const nroot = rest.match(/^nroot\(([^,]*),(.+)\)$/s);
    if (nroot) {
      out += `\\sqrt[${vectoraToLatex(nroot[1])}]{${vectoraToLatex(nroot[2].replace(/\)$/, ''))}}`;
      i += rest.length;
      continue;
    }
    const fn = rest.match(/^(sqrt|cbrt|abs)\(/);
    if (fn) {
      let depth = 0;
      let close = -1;
      for (let j = fn[0].length - 1; j < rest.length; j++) {
        if (rest[j] === '(') depth++;
        else if (rest[j] === ')' && --depth === 0) { close = j; break; }
      }
      if (close >= 0) {
        const body = vectoraToLatex(rest.slice(fn[0].length, close));
        out += fn[1] === 'sqrt' ? `\\sqrt{${body}}` : fn[1] === 'cbrt' ? `\\sqrt[3]{${body}}` : `\\left|${body}\\right|`;
        i += close + 1;
        continue;
      }
    }
    if (rest.startsWith('^(')) {
      const group = rest.indexOf(')');
      if (group >= 0) { out += `^{${vectoraToLatex(rest.slice(2, group))}}`; i += group + 1; continue; }
    }
    if (text[i] === '^') {
      let end = i + 1;
      while (end < text.length && /[A-Za-z0-9_.]/.test(text[end])) end++;
      out += `^{${escapeLatexText(text.slice(i + 1, end))}}`;
      i = end;
      continue;
    }
    if (text[i] === '/') {
      out += '/'; i++; continue;
    }
    const name = text.slice(i).match(/^[A-Za-z][A-Za-z0-9_]*/)?.[0];
    if (name) {
      out += FUNCTION_NAMES.has(name) ? `\\${name}` : escapeLatexText(name);
      i += name.length;
      continue;
    }
    const symbol = text[i];
    out += symbol === '*' ? '\\cdot ' : symbol === '<' && text[i + 1] === '=' ? '\\le ' : symbol === '>' && text[i + 1] === '=' ? '\\ge ' : symbol === 'π' ? '\\pi ' : symbol === 'τ' ? '\\tau ' : symbol;
    i += symbol === '<' && text[i + 1] === '=' || symbol === '>' && text[i + 1] === '=' ? 2 : 1;
  }
  return out;
}

function normalizeAscii(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
    .replaceAll('×', '*').replaceAll('·', '*')
    .replaceAll('≤', '<=').replaceAll('≥', '>=')
    .replaceAll('π', 'pi').replaceAll('τ', 'tau').replaceAll('∞', 'inf');
}

/**
 * MathLive's ascii-math serializer is intentionally used here instead of
 * scraping rendered DOM. It preserves structured fractions, roots, scripts,
 * fences and selection edits as parser-friendly text.
 */
export function mathfieldValueToVectora(asciiMath: string): string {
  let text = normalizeAscii(asciiMath)
    .replace(/\\operatorname\s*\{([^}]*)\}/g, '$1')
    .replace(/\\left|\\right/g, '')
    .replace(/\\(cdot|times)/g, '*')
    .replace(/\\(le|leq)/g, '<=')
    .replace(/\\(ge|geq)/g, '>=')
    .replace(/\\(pi|tau|infty)/g, (_, name: string) => name === 'pi' ? 'pi' : name === 'tau' ? 'tau' : 'inf')
    .replace(/\\([A-Za-z]+)/g, '$1');
  text = text.replace(/(sqrt|cbrt|abs)\(\(\)\)/g, '$1()');
  // ASCII-math uses `root(3)(x)` for indexed roots in current MathLive.
  text = text.replace(/root\(([^()]*)\)\(([^()]*)\)/g, 'nroot($1,$2)');
  text = text.replace(/\b([A-Za-z]+)\s*\(([^()]*)\)/g, (whole, name: string, body: string) => {
    if (name === 'sqrt' || name === 'abs' || name === 'cbrt') return `${name}(${body})`;
    return `${name}(${body})`;
  });
  return text.replace(/\s*\/\s*/g, '/').replace(/\s*\^\s*/g, '^').replace(/\^\{([^{}]*)\}/g, '^($1)');
}

export function latexCursorToVectora(text: string, latexOffset: number): number {
  return mathfieldValueToVectora(text.slice(0, latexOffset)).length;
}

export interface MathfieldCursorSource {
  position: number;
  lastOffset: number;
  getValue(start: number, end: number, format: 'ascii-math'): string;
}

const compact = (text: string): string => text.replace(/\s+/g, '');

/** MathLive positions are atom offsets, not JavaScript string offsets. */
export function vectoraCursorToMathfield(text: string, vectoraOffset: number, field: MathfieldCursorSource): number {
  const target = compact(text.slice(0, Math.max(0, vectoraOffset)));
  let best = 0;
  for (let position = 0; position <= field.lastOffset; position++) {
    const prefix = compact(mathfieldValueToVectora(field.getValue(0, position, 'ascii-math')));
    if (target.startsWith(prefix) && prefix.length <= target.length) best = position;
  }
  return best;
}

export function mathfieldCursorToVectora(field: MathfieldCursorSource): number {
  return compact(mathfieldValueToVectora(field.getValue(0, field.position, 'ascii-math'))).length;
}
