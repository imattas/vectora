const glyphs = (text: string): string => text
  .replaceAll('<=', '≤').replaceAll('>=', '≥')
  .replaceAll('*', '×').replaceAll('-', '−')
  .replace(/\bpi\b/g, 'π').replace(/\btau\b/g, 'τ').replace(/\binf\b/g, '∞');

export const formatPlainGlyphs = glyphs;

const matchingParen = (text: string, open: number): number => {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '(') depth++;
    else if (text[i] === ')' && --depth === 0) return i;
  }
  return -1;
};

const topLevelSlash = (text: string): number => {
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '(') depth++;
    else if (text[i] === ')') depth--;
    else if (text[i] === '/' && depth === 0) return i;
  }
  return -1;
};

const topLevelComma = (text: string, start: number, end: number): number => {
  let depth = 0;
  for (let i = start; i < end; i++) {
    if (text[i] === '(') depth++;
    else if (text[i] === ')') depth--;
    else if (text[i] === ',' && depth === 0) return i;
  }
  return -1;
};

const atomStart = (text: string, end: number): number => {
  if (text[end] === ')') {
    let depth = 0;
    for (let i = end; i >= 0; i--) {
      if (text[i] === ')') depth++;
      else if (text[i] === '(' && --depth === 0) return i;
    }
  }
  let i = end;
  while (i >= 0 && /[A-Za-z0-9_.]/.test(text[i])) i--;
  return i + 1;
};

function mark(node: HTMLElement, start: number, end: number): HTMLElement {
  node.dataset.sourceStart = String(start); node.dataset.sourceEnd = String(end);
  return node;
}

function appendFormatted(parent: HTMLElement, text: string, fractions: boolean, sourceOffset = 0): void {
  if (fractions) {
    const slash = topLevelSlash(text);
    if (slash >= 0) {
      const start = atomStart(text, slash - 1);
      let end = slash + 1;
      if (text[end] === '(') { const close = matchingParen(text, end); if (close >= 0) end = close + 1; }
      else while (end < text.length && /[A-Za-z0-9_.]/.test(text[end])) end++;
      if (start < slash && end > slash + 1) {
        appendFormatted(parent, text.slice(0, start), false, sourceOffset);
        const fraction = document.createElement('span'); fraction.className = 'math-fraction';
        const numerator = document.createElement('span'); numerator.className = 'math-numerator';
        const denominator = document.createElement('span'); denominator.className = 'math-denominator';
        const numeratorText = text.slice(start, slash).replace(/^\((.*)\)$/, '$1');
        const denominatorText = text.slice(slash + 1, end).replace(/^\((.*)\)$/, '$1');
        mark(numerator, sourceOffset + start, sourceOffset + slash);
        mark(denominator, sourceOffset + slash + 1, sourceOffset + end);
        appendFormatted(numerator, numeratorText, false, sourceOffset + start + (text[start] === '(' ? 1 : 0));
        appendFormatted(denominator, denominatorText, false, sourceOffset + slash + 1 + (text[slash + 1] === '(' ? 1 : 0));
        fraction.append(numerator, denominator); parent.append(fraction);
        appendFormatted(parent, text.slice(end), true, sourceOffset + end);
        return;
      }
    }
  }
  for (let i = 0; i < text.length;) {
    const functionName = text.startsWith('sqrt(', i) ? 'sqrt' : text.startsWith('cbrt(', i) ? 'cbrt' : text.startsWith('abs(', i) ? 'abs' : null;
    if (functionName) {
      const open = i + functionName.length;
      const close = matchingParen(text, open);
      if (close >= 0) {
        const body = document.createElement('span');
        body.className = functionName === 'abs' ? 'math-abs' : 'math-root'; mark(body, sourceOffset + i, sourceOffset + close + 1);
        const content = document.createElement('span'); content.className = 'math-radicand'; mark(content, sourceOffset + open + 1, sourceOffset + close);
        appendFormatted(content, text.slice(open + 1, close), true, sourceOffset + open + 1);
        if (functionName === 'sqrt' || functionName === 'cbrt') { const radical = document.createElement('span'); radical.className = 'math-radical'; radical.textContent = functionName === 'cbrt' ? '³√' : '√'; body.append(radical, content); }
        else { const left = document.createElement('span'); left.textContent = '|'; const right = document.createElement('span'); right.textContent = '|'; body.append(left, content, right); }
        parent.append(body); i = close + 1; continue;
      }
    }
    if (text.startsWith('nroot(', i)) {
      const open = i + 5;
      const close = matchingParen(text, open);
      const comma = close >= 0 ? topLevelComma(text, open + 1, close) : -1;
      if (close >= 0 && comma >= 0) {
        const body = document.createElement('span'); body.className = 'math-root'; mark(body, sourceOffset + i, sourceOffset + close + 1);
        const index = document.createElement('sup'); index.className = 'math-root-index'; mark(index, sourceOffset + open + 1, sourceOffset + comma);
        appendFormatted(index, text.slice(open + 1, comma), false, sourceOffset + open + 1);
        const radical = document.createElement('span'); radical.className = 'math-radical'; radical.textContent = '√';
        const content = document.createElement('span'); content.className = 'math-radicand'; mark(content, sourceOffset + comma + 1, sourceOffset + close);
        appendFormatted(content, text.slice(comma + 1, close), true, sourceOffset + comma + 1);
        body.append(index, radical, content); parent.append(body); i = close + 1; continue;
      }
    }
    if (text[i] === '^') {
      let end = i + 1;
      if (text[end] === '(') { const close = matchingParen(text, end); if (close >= 0) end = close + 1; }
      else while (end < text.length && /[A-Za-z0-9_.]/.test(text[end])) end++;
      if (end > i + 1) {
        const exponent = document.createElement('sup');
        mark(exponent, sourceOffset + i + 1, sourceOffset + end);
        appendFormatted(exponent, text.slice(i + 1, end).replace(/^\((.*)\)$/, '$1'), false, sourceOffset + i + 1 + (text[i + 1] === '(' ? 1 : 0));
        parent.append(exponent); i = end; continue;
      }
    }
    let end = i + 1;
    while (end < text.length && text[end] !== '/' && text[end] !== '^'
      && !text.startsWith('sqrt(', end) && !text.startsWith('cbrt(', end) && !text.startsWith('nroot(', end) && !text.startsWith('abs(', end)) end++;
    const chunk = document.createElement('span'); mark(chunk, sourceOffset + i, sourceOffset + end);
    chunk.textContent = formatPlainGlyphs(text.slice(i, end)); parent.append(chunk);
    i = end;
  }
}

/** Build a visual-only Desmos-style preview; canonical source stays editable. */
export function renderMathPreview(text: string): HTMLSpanElement {
  const preview = document.createElement('span'); preview.className = 'math-preview'; preview.setAttribute('aria-hidden', 'true');
  appendFormatted(preview, text, true);
  return preview;
}
