export type IconName = 'add' | 'close' | 'keyboard' | 'menu' | 'reset';

const PATHS: Record<IconName, string> = {
  add: '<path d="M12 5v14M5 12h14"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  keyboard: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M6 9h.01M9 9h.01M12 9h.01M15 9h.01M18 9h.01M6 12h.01M9 12h.01M12 12h.01M15 12h.01M6 15h8M16 15h2"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  reset: '<path d="M4 12a8 8 0 1 0 2.3-5.7L4 8.6M4 4v4.6h4.6"/>',
};

export function makeIcon(name: IconName, label?: string): SVGSVGElement {
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.setAttribute('viewBox', '0 0 24 24');
  icon.setAttribute('aria-hidden', 'true');
  if (label) icon.setAttribute('aria-label', label);
  icon.innerHTML = PATHS[name];
  return icon;
}
