export type MathTemplate = 'sqrt' | 'fraction' | 'power' | 'abs' | 'cbrt';

export interface TemplateResult {
  text: string;
  cursorOffset: number;
}

export function templateInsertion(template: MathTemplate, selection = ''): TemplateResult {
  if (template === 'sqrt') {
    return selection
      ? { text: `sqrt(${selection})`, cursorOffset: selection.length + 5 }
      : { text: 'sqrt()', cursorOffset: 5 };
  }
  if (template === 'cbrt') {
    return selection
      ? { text: `cbrt(${selection})`, cursorOffset: selection.length + 5 }
      : { text: 'cbrt()', cursorOffset: 5 };
  }
  if (template === 'abs') {
    return selection
      ? { text: `abs(${selection})`, cursorOffset: selection.length + 4 }
      : { text: 'abs()', cursorOffset: 4 };
  }
  if (template === 'fraction') {
    return selection
      ? { text: `(${selection})/()`, cursorOffset: selection.length + 4 }
      : { text: '()/()', cursorOffset: 4 };
  }
  return selection
    ? { text: `(${selection})^()`, cursorOffset: selection.length + 4 }
    : { text: '^()', cursorOffset: 2 };
}
