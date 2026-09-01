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

function appendFormatted(parent: HTMLElement, text: string, fractions: boolean): void {
  if (fractions) {
    const slash = text.indexOf('/');
    if (slash >= 0) {
      const start = atomStart(text, slash - 1);
      let end = slash + 1;
      if (text[end] === '(') { const close = matchingParen(text, end); if (close >= 0) end = close + 1; }
      else while (end < text.length && /[A-Za-z0-9_.]/.test(text[end])) end++;
      if (start < slash && end > slash + 1) {
        appendFormatted(parent, text.slice(0, start), false);
        const fraction = document.createElement('span'); fraction.className = 'math-fraction';
        const numerator = document.createElement('span'); numerator.className = 'math-numerator';
        const denominator = document.createElement('span'); denominator.className = 'math-denominator';
        appendFormatted(numerator, text.slice(start, slash).replace(/^\((.*)\)$/, '$1'), false);
        appendFormatted(denominator, text.slice(slash + 1, end).replace(/^\((.*)\)$/, '$1'), false);
        fraction.append(numerator, denominator); parent.append(fraction);
        appendFormatted(parent, text.slice(end), true);
        return;
      }
    }
  }
  for (let i = 0; i < text.length;) {
    if (text[i] === '^') {
      let end = i + 1;
      if (text[end] === '(') { const close = matchingParen(text, end); if (close >= 0) end = close + 1; }
      else while (end < text.length && /[A-Za-z0-9_.]/.test(text[end])) end++;
      if (end > i + 1) {
        const exponent = document.createElement('sup');
        appendFormatted(exponent, text.slice(i + 1, end).replace(/^\((.*)\)$/, '$1'), false);
        parent.append(exponent); i = end; continue;
      }
    }
    let end = i + 1;
    while (end < text.length && text[end] !== '/' && text[end] !== '^') end++;
    parent.append(document.createTextNode(formatPlainGlyphs(text.slice(i, end))));
    i = end;
  }
}

/** Build a visual-only Desmos-style preview; canonical source stays editable. */
export function renderMathPreview(text: string): HTMLSpanElement {
  const preview = document.createElement('span'); preview.className = 'math-preview'; preview.setAttribute('aria-hidden', 'true');
  appendFormatted(preview, text, true);
  return preview;
}
