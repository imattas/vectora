const STORAGE_KEY = 'vectora-onboarding-v1';
import { makeIcon } from './icon.ts';

interface OnboardingOptions { initiallyOpen: boolean }

const STEPS = [
  ['01 / WRITE', 'Your equations are the canvas', 'Click the editor and type ordinary math. Vectora updates the graph as you work — curves, fields, geometry, probability, and 3D scenes use the same surface.', 'Try: y = sin(x) or x^2 + y^2 = 4'],
  ['02 / EXPLORE', 'Move through the graph', 'Drag the canvas to pan, use the wheel or pinch to zoom, and use two fingers or the right mouse button to orbit 3D scenes. Reset the view with the home button.', 'The graph owns gestures; the sidebar owns text.'],
  ['03 / DISCOVER', 'Start from an example', 'Open Examples in the sidebar for ready-to-edit scenes, or use the + menu for points, lines, circles, polygons, tables, and system solving. Nothing is sent to a server.', 'Examples are starting points, not locked demos.'],
  ['04 / SHARE', 'The address bar is your share button', 'Every graph is encoded in its URL. Edit a row, copy the link, and someone else can open the same equations immediately. Vectora is still in development, so expect rough edges.', 'Made by Ian Mattas · WebGL2 required'],
] as const;

function readDone(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) === 'complete'; } catch { return false; }
}

function markDone(): void {
  try { localStorage.setItem(STORAGE_KEY, 'complete'); } catch { /* private mode */ }
}

export function initOnboarding({ initiallyOpen }: OnboardingOptions): void {
  const help = document.getElementById('onboarding-help');
  if (!help) return;
  const dialog = document.createElement('dialog');
  dialog.className = 'onboarding-dialog';
  dialog.setAttribute('aria-labelledby', 'onboarding-title');
  dialog.setAttribute('aria-describedby', 'onboarding-body');
  const shell = document.createElement('div'); shell.className = 'onboarding-shell';
  const close = document.createElement('button'); close.className = 'onboarding-close'; close.type = 'button'; close.append(makeIcon('close')); close.setAttribute('aria-label', 'Close onboarding');
  const content = document.createElement('div');
  const footer = document.createElement('div'); footer.className = 'onboarding-footer';
  shell.append(close, content, footer); dialog.append(shell); document.body.append(dialog);
  let step = -1;
  const finish = () => { markDone(); if (dialog.open) dialog.close(); help.focus(); };
  const render = () => {
    content.replaceChildren(); footer.replaceChildren();
    if (step < 0) {
      const eyebrow = document.createElement('div'); eyebrow.className = 'onboarding-eyebrow'; eyebrow.textContent = 'VECTORA / BETA';
      const h = document.createElement('h1'); h.id = 'onboarding-title'; h.textContent = 'Welcome to Vectora';
      const p = document.createElement('p'); p.id = 'onboarding-body'; p.textContent = 'A browser-first graphing studio for turning ideas into pictures, patterns, and motion.';
      const note = document.createElement('p'); note.className = 'onboarding-note'; note.textContent = 'Vectora is still in development and is made by Ian Mattas.';
      const start = document.createElement('button'); start.className = 'onboarding-primary'; start.type = 'button'; start.textContent = 'Start onboarding'; start.onclick = () => { step = 0; render(); };
      const skip = document.createElement('button'); skip.className = 'onboarding-secondary'; skip.type = 'button'; skip.textContent = 'Skip onboarding'; skip.onclick = finish;
      content.append(eyebrow, h, p, note); footer.append(start, skip); start.focus(); return;
    }
    const [eyebrowText, title, body, hintText] = STEPS[step];
    const eyebrow = document.createElement('div'); eyebrow.className = 'onboarding-eyebrow'; eyebrow.textContent = eyebrowText;
    const h = document.createElement('h1'); h.id = 'onboarding-title'; h.textContent = title;
    const p = document.createElement('p'); p.id = 'onboarding-body'; p.textContent = body;
    const hint = document.createElement('code'); hint.className = 'onboarding-hint'; hint.textContent = hintText;
    const progress = document.createElement('div'); progress.className = 'onboarding-progress'; progress.setAttribute('aria-label', `Step ${step + 1} of ${STEPS.length}`);
    for (let i = 0; i < STEPS.length; i++) { const dot = document.createElement('span'); dot.className = i === step ? 'active' : ''; progress.append(dot); }
    const back = document.createElement('button'); back.className = 'onboarding-secondary'; back.type = 'button'; back.textContent = 'Back'; back.disabled = step === 0; back.onclick = () => { step--; render(); };
    const skip = document.createElement('button'); skip.className = 'onboarding-text'; skip.type = 'button'; skip.textContent = 'Skip onboarding'; skip.onclick = finish;
    const next = document.createElement('button'); next.className = 'onboarding-primary'; next.type = 'button'; next.textContent = step === STEPS.length - 1 ? 'Finish' : 'Next'; next.onclick = step === STEPS.length - 1 ? finish : () => { step++; render(); };
    content.append(eyebrow, h, p, hint, progress); footer.append(back, skip, next); next.focus();
  };
  const open = () => { step = -1; dialog.showModal(); render(); };
  close.onclick = finish;
  dialog.addEventListener('cancel', event => { event.preventDefault(); finish(); });
  dialog.addEventListener('click', event => { if (event.target === dialog) finish(); });
  help.addEventListener('click', open);
  if (initiallyOpen && !readDone()) open();
}
