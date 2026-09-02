/**
 * Browser tests for the contentEditable equation editor: `pnpm test:editor`.
 *
 * The editor is the app's primary input surface and its logic (caret math,
 * state/DOM sync, widget-boundary handling) can only run in a real DOM, so it
 * is invisible to the vitest suite. This drives the actual app in headless
 * Chromium and asserts behavior end to end.
 *
 * Widget-origin cases are the reason this exists: sliders and error blocks
 * live *inside* the contentEditable as contenteditable=false widgets, so their
 * inputs bubble key and clipboard events to the editor host. Without target
 * guards those events edit whatever line the caret last touched.
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium, type Page } from 'playwright';

const PORT = 5197;
const ORIGIN = `http://localhost:${PORT}`;
const ROOT = fileURLToPath(new URL('..', import.meta.url));

const results: { name: string; ok: boolean; detail: string }[] = [];

function check(name: string, ok: boolean, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail && !ok ? `\n      ${detail}` : ''}`);
}

/** Run a scenario; a thrown error (e.g. a widget the bug destroyed) is a failure, not a crash. */
async function scenario(label: string, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (err) {
    check(label, false, String(err).split('\n')[0]);
  }
}

const rowTexts = (page: Page) =>
  page.evaluate(() => [...document.querySelectorAll<HTMLElement>('.eq-line')].map(line => {
    const copy = line.cloneNode(true) as HTMLElement;
    copy.querySelectorAll('.eq-widget, .math-preview, .row-options-wrap').forEach(node => node.remove());
    return copy.textContent;
  }));

async function load(page: Page, rows: string[]) {
  // goto with only a differing hash does not reload, which would leak the
  // previous scenario's equations into the next one.
  await page.goto('about:blank');
  await page.goto(ORIGIN + '/#' + rows.map(encodeURIComponent).join(';'));
  await page.waitForSelector('.eq-line');
  await page.waitForSelector('.eq-slider input[type=range]', { timeout: 3000 }).catch(() => {});
}

/** Put the caret in a line at a character offset (mirrors user clicking). */
async function caretTo(page: Page, line: number, offset: number) {
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.evaluate(
      ({ line, offset }) => {
        const el = [...document.querySelectorAll('.eq-line')][line] as HTMLElement;
        el.focus();
        // The focused row keeps canonical text in `.math-source`; the visual
        // preview is a sibling and may contain multiple formatted text nodes.
        // Select the source text node so offsets are character offsets, not
        // child-element offsets.
        const source = el.querySelector<HTMLElement>('.math-source');
        const node = source?.firstChild ?? el.firstChild ?? el;
        const r = document.createRange();
        r.setStart(node, Math.min(offset, node.textContent?.length ?? 0));
        r.collapse(true);
        const sel = getSelection()!;
        sel.removeAllRanges();
        sel.addRange(r);
      },
      { line, offset },
    );
    const ready = await page.evaluate(({ line, offset }) => {
      const el = [...document.querySelectorAll('.eq-line')][line] as HTMLElement;
      const sel = getSelection();
      const editor = document.querySelector('#equations');
      return (document.activeElement === el || document.activeElement === editor || el.contains(document.activeElement)) && !!sel?.isCollapsed
        && sel.focusNode?.parentElement?.closest('.math-source') === el.querySelector('.math-source')
        && sel.focusOffset === offset;
    }, { line, offset });
    if (ready) return;
    await page.waitForTimeout(10);
  }
  throw new Error(`could not establish caret at line ${line}, offset ${offset}`);
}

const viteScript = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url));
const server = spawn(process.execPath, [viteScript, '--port', String(PORT), '--strictPort'], {
  cwd: ROOT,
  stdio: 'ignore',
});
process.on('exit', () => server.kill());

for (let i = 0; ; i++) {
  try {
    if ((await fetch(ORIGIN)).ok) break;
  } catch {}
  if (i > 100) throw new Error(`vite did not come up on ${ORIGIN}`);
  await new Promise(r => setTimeout(r, 200));
}

// CHROMIUM overrides the browser binary, for containers with a system build.
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM || undefined,
  args: ['--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
const runtimeErrors: string[] = [];
page.on('pageerror', error => runtimeErrors.push(`pageerror: ${error.message}`));
page.on('console', message => { if (message.type() === 'error') runtimeErrors.push(`console: ${message.text()}`); });

// --- events originating in slider widgets must not edit the document ---

await load(page, ['a = 1', 'y = sin(a x)']);
await scenario('paste into slider bound', async () => {
  // Paste into a slider bound input: must reach the input, not the equations.
  const before = await rowTexts(page);
  await page.evaluate(() => {
    const min = document.querySelector<HTMLInputElement>('.eq-slider input[type=number]')!;
    min.focus();
    const dt = new DataTransfer();
    dt.setData('text/plain', '-42');
    const ev = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
    min.dispatchEvent(ev);
    (globalThis as { __pasteDefaultPrevented?: boolean }).__pasteDefaultPrevented = ev.defaultPrevented;
  });
  const after = await rowTexts(page);
  const prevented = await page.evaluate(
    () => (globalThis as { __pasteDefaultPrevented?: boolean }).__pasteDefaultPrevented,
  );
  check(
    'paste into slider bound does not rewrite equations',
    JSON.stringify(before) === JSON.stringify(after),
    `before=${JSON.stringify(before)} after=${JSON.stringify(after)}`,
  );
  check('paste into slider bound is not preventDefaulted', prevented === false, `prevented=${prevented}`);
});

await scenario('Enter in slider bound', async () => {
  // Enter inside a bound input must not split an unrelated equation.
  await caretTo(page, 1, 4); // caret parked mid "y = sin(a x)"
  const before = await rowTexts(page);
  await page.evaluate(() => {
    const min = document.querySelector<HTMLInputElement>('.eq-slider input[type=number]')!;
    min.focus();
    min.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  });
  const after = await rowTexts(page);
  check(
    'Enter in slider bound does not split a line',
    JSON.stringify(before) === JSON.stringify(after),
    `before=${JSON.stringify(before)} after=${JSON.stringify(after)}`,
  );
});

await scenario('undo shortcut in slider bound', async () => {
  // Cmd/Ctrl+Z inside a bound input must stay native, not pop our undo stack.
  const before = await rowTexts(page);
  await page.evaluate(() => {
    const min = document.querySelector<HTMLInputElement>('.eq-slider input[type=number]')!;
    min.focus();
    min.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'z', metaKey: true, ctrlKey: true, bubbles: true, cancelable: true }),
    );
  });
  const after = await rowTexts(page);
  check(
    'undo shortcut in slider bound does not revert equations',
    JSON.stringify(before) === JSON.stringify(after),
    `before=${JSON.stringify(before)} after=${JSON.stringify(after)}`,
  );
});

// --- normal editing still works (regression guards for the same handlers) ---

await scenario('Enter in a line splits', async () => {
  await load(page, ['a = 1', 'y = sin(a x)']);
  await caretTo(page, 1, 12); // end of "y = sin(a x)"
  await page.evaluate(() => {
    const el = document.querySelector<HTMLElement>('#equations')!;
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  });
  const after = await rowTexts(page);
  check('Enter in a line still splits into a new row', after.length === 3, `rows=${JSON.stringify(after)}`);
});

await scenario('paste a system', async () => {
  // Pasting a system of equations into an empty document: the headline
  // capability of the unified editor.
  await load(page, ['y = x', 'y = 2x']);
  await page.evaluate(() => {
    const el = document.querySelector<HTMLElement>('#equations')!;
    el.focus();
    const r = document.createRange();
    r.selectNodeContents(el);
    const sel = getSelection()!;
    sel.removeAllRanges();
    sel.addRange(r);
    const dt = new DataTransfer();
    dt.setData('text/plain', 'a = 2\ny = a x^2\ny = x^3');
    el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  });
  const after = await rowTexts(page);
  check(
    'pasting a system into an empty document creates one row per statement',
    after.length === 3 && after[0] === 'a = 2' && after[1] === 'y = a x^2' && after[2] === 'y = x^3',
    `rows=${JSON.stringify(after)}`,
  );
});

await scenario('insertParagraph', async () => {
  // insertParagraph (mobile IME / dictation newline) must split like Enter.
  await load(page, ['y = x']);
  await caretTo(page, 0, 5);
  await page.evaluate(() => {
    const el = document.querySelector<HTMLElement>('#equations')!;
    el.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertParagraph', bubbles: true, cancelable: true }));
  });
  const after = await rowTexts(page);
  check('insertParagraph splits the line (IME/dictation newline)', after.length === 2, `rows=${JSON.stringify(after)}`);
});

await scenario('typing syncs', async () => {
  // Typing still syncs to state and renders.
  await load(page, ['y = x']);
  await caretTo(page, 0, 5);
  await page.keyboard.type('^2');
  // Edits normalize the address to the /g/ path form (writeUrl), so the
  // payload lives in the pathname, not the hash.
  const result = await page.evaluate(() => ({
    url: decodeURIComponent(location.pathname + location.hash),
    state: (globalThis as { __eq?: { equations: Array<{ text: string }> } }).__eq?.equations.map(e => e.text),
  }));
  check('typing syncs state to the URL', result.url.includes('y = x^2'), `url=${result.url} state=${JSON.stringify(result.state)}`);
});

await scenario('history write failures do not interrupt editing', async () => {
  await load(page, ['y = x']);
  await page.evaluate(() => {
    history.replaceState = (() => { throw new DOMException('history quota', 'SecurityError'); }) as typeof history.replaceState;
  });
  await caretTo(page, 0, 5);
  await page.keyboard.type('^2');
  const after = await rowTexts(page);
  check('history write failures do not interrupt editing', after[0] === 'y = x^2', `rows=${JSON.stringify(after)}`);
});

await scenario('canonicalization preserves deployment query parameters', async () => {
  await page.goto('about:blank');
  await page.goto(ORIGIN + '/?tenant=demo#y%20%3D%20x');
  await page.waitForSelector('.eq-line');
  const query = await page.evaluate(() => location.search);
  check('URL canonicalization preserves query parameters', query === '?tenant=demo', `query=${query}`);
});

// --- comment rows and collapsible groups ---

const visibleRows = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('.eq-line')]
      .filter(l => !l.classList.contains('eq-hidden'))
      .map(line => {
        const copy = line.cloneNode(true) as HTMLElement;
        copy.querySelectorAll('.eq-widget, .math-preview, .row-options-wrap').forEach(node => node.remove());
        return copy.textContent;
      }),
  );

/** Click a line's left gutter (chevron/color dot) via the app's pointerdown path. */
const gutterClick = (page: Page, line: number) =>
  page.evaluate(l => {
    const el = [...document.querySelectorAll<HTMLElement>('.eq-line')][l];
    const r = el.getBoundingClientRect();
    el.dispatchEvent(new PointerEvent('pointerdown', { clientX: r.left + 10, clientY: r.top + 10, bubbles: true, cancelable: true }));
  }, line);

await scenario('comment rows collapse their group', async () => {
  await load(page, ['# Lines', 'y=x', 'y=x^2', '# Another group', 'y=3']);
  const classed = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('.eq-line')].map(l => l.classList.contains('is-comment')),
  );
  check(
    '# rows render as comments, not errors',
    JSON.stringify(classed) === JSON.stringify([true, false, false, true, false])
      && (await page.evaluate(() => document.querySelectorAll('.eq-error').length)) === 0,
    `is-comment=${JSON.stringify(classed)}`,
  );
  await gutterClick(page, 0);
  const collapsed = await visibleRows(page);
  const badge = await page.evaluate(() => document.querySelector<HTMLElement>('.eq-line')!.dataset.hidden);
  check(
    'gutter click collapses the group up to the next comment',
    JSON.stringify(collapsed) === JSON.stringify(['# Lines', '# Another group', 'y=3']) && badge === '2 hidden',
    `visible=${JSON.stringify(collapsed)} badge=${badge}`,
  );
  await gutterClick(page, 0);
  const expanded = await visibleRows(page);
  check('second gutter click expands it again', expanded.length === 5, `visible=${JSON.stringify(expanded)}`);
});

await scenario('color picker supports keyboard navigation and focus return', async () => {
  await load(page, ['y=x']);
  await gutterClick(page, 0);
  const opened = await page.evaluate(() => ({
    hidden: document.querySelector<HTMLElement>('.color-picker')?.hidden,
    active: document.activeElement?.className,
  }));
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Escape');
  const closed = await page.evaluate(() => ({
    hidden: document.querySelector<HTMLElement>('.color-picker')?.hidden,
    activeColorTrigger: document.activeElement?.classList.contains('row-color-trigger'),
    triggerCount: document.querySelectorAll('.row-color-trigger').length,
    triggerConnected: document.querySelector<HTMLButtonElement>('.row-color-trigger')?.isConnected,
  }));
  check('color picker opens on a focused swatch', opened.hidden === false && opened.active === 'color-swatch', JSON.stringify(opened));
  check('color picker Escape closes and returns focus', closed.hidden === true && closed.activeColorTrigger === true, JSON.stringify(closed));
  await page.locator('.row-color-trigger').first().focus();
  await page.keyboard.press('Enter');
  const keyboardColor = await page.evaluate(() => ({
    hidden: document.querySelector<HTMLElement>('.color-picker')?.hidden,
    active: document.activeElement?.className,
  }));
  await page.keyboard.press('Escape');
  const restoredColor = await page.evaluate(() => document.activeElement?.classList.contains('row-color-trigger'));
  check('color picker opens from its keyboard button', keyboardColor.hidden === false && keyboardColor.active === 'color-swatch' && restoredColor === true, JSON.stringify({ keyboardColor, restoredColor }));
});

await scenario('complex plots compile through the WebGL renderer', async () => {
  await page.goto(ORIGIN + '/#' + encodeURIComponent('ln(w)'));
  await page.waitForTimeout(300);
  const state = await page.evaluate(() => ({
    canvas: document.querySelector<HTMLCanvasElement>('#gl')?.width ?? 0,
    status: document.querySelector<HTMLElement>('#render-status')?.textContent ?? '',
  }));
  check('complex plots compile through the WebGL renderer', state.canvas > 0 && !/WebGL2 is required|shader error/i.test(state.status), JSON.stringify(state));
});

await scenario('parametric 3D scenes auto-frame with SVG controls', async () => {
  await page.goto(ORIGIN + '/#' + encodeURIComponent('(u, v, sin(2pi u))'));
  await page.waitForTimeout(300);
  const state = await page.evaluate(() => ({
    radius: (globalThis as { __eq?: { camera?: { radius: number } } }).__eq?.camera?.radius ?? Infinity,
    errors: [...document.querySelectorAll('.eq-error')].map(el => el.textContent),
    svgControls: document.querySelectorAll('#zoom-in svg, #zoom-out svg, #home-view svg, #onboarding-help svg, #sidebar-actions .add-menu-trigger svg, #keyboard-dock .symbol-keyboard-trigger svg').length,
    controlsRole: document.querySelector('#graph-controls')?.getAttribute('role'),
  }));
  await page.goto(ORIGIN + '/#' + encodeURIComponent('tube((sin(2pi u) + 2sin(4pi u), cos(2pi u) - 2cos(4pi u), -sin(6pi u)))'));
  await page.waitForTimeout(300);
  const knot = await page.evaluate(() => ({
    radius: (globalThis as { __eq?: { camera?: { radius: number } } }).__eq?.camera?.radius ?? Infinity,
    errors: [...document.querySelectorAll('.eq-error')].map(el => el.textContent),
  }));
  await page.goto(ORIGIN + '/#' + encodeURIComponent('(u, v, sin(2pi u))'));
  await page.locator('#home-view').click();
  await page.waitForTimeout(300);
  const resetRadius = await page.evaluate(() => (globalThis as { __eq?: { camera?: { radius: number } } }).__eq?.camera?.radius ?? Infinity);
  await page.locator('#examples > summary').click();
  const parametricExamples = page.locator('#examples details').filter({ hasText: 'parametric 3d' }).first();
  await parametricExamples.locator(':scope > summary').click();
  await parametricExamples.locator('.ex-item').filter({ hasText: 'parametric surface' }).click();
  await page.waitForTimeout(300);
  const exampleErrors = await page.locator('.eq-error').allTextContents();
  check('parametric 3D scenes auto-frame with SVG controls', state.radius < 6 && knot.radius > 0 && resetRadius < 6 && state.errors.length === 0 && knot.errors.length === 0 && exampleErrors.length === 0 && state.svgControls === 6 && state.controlsRole === 'group', JSON.stringify({ ...state, knot, resetRadius, exampleErrors }));
});

await scenario('row action menus expose state and restore focus', async () => {
  await load(page, ['y=x']);
  const trigger = page.locator('.row-options-trigger').first();
  await trigger.click();
  const opened = await page.evaluate(() => ({
    expanded: document.querySelector<HTMLButtonElement>('.row-options-trigger')?.getAttribute('aria-expanded'),
    controls: document.querySelector<HTMLButtonElement>('.row-options-trigger')?.getAttribute('aria-controls'),
    menu: document.querySelector<HTMLElement>('.row-options')?.getAttribute('role'),
    items: document.querySelectorAll('.row-options [role="menuitem"]').length,
    focusedItem: document.activeElement?.getAttribute('role'),
  }));
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Escape');
  const closed = await page.evaluate(() => ({
    expanded: document.querySelector<HTMLButtonElement>('.row-options-trigger')?.getAttribute('aria-expanded'),
    hidden: document.querySelector<HTMLElement>('.row-options')?.hidden,
    focused: document.activeElement?.classList.contains('row-options-trigger'),
  }));
  check('row action menu exposes menu state', opened.expanded === 'true' && !!opened.controls && opened.menu === 'menu' && opened.items > 0 && opened.focusedItem === 'menuitem', JSON.stringify(opened));
  check('row action menu Escape restores focus', closed.expanded === 'false' && closed.hidden === true && closed.focused === true, JSON.stringify(closed));
});

await scenario('collapsed rows still copy and share', async () => {
  await load(page, ['# Lines', 'y=x', 'y=x^2']);
  await gutterClick(page, 0);
  const url = await page.evaluate(() => decodeURIComponent(location.pathname + location.hash));
  check(
    'collapsed rows stay in the share URL',
    url.includes('y=x^2') && url.includes('# Lines'),
    `url=${url}`,
  );
});

await scenario('Enter after a collapsed heading expands it', async () => {
  await load(page, ['# Lines', 'y=x']);
  await gutterClick(page, 0);
  await caretTo(page, 0, 7); // caret at end of "# Lines"
  await page.keyboard.press('Enter');
  const visible = await visibleRows(page);
  check(
    'the new row is visible (group auto-expanded)',
    visible.length === 3,
    `visible=${JSON.stringify(visible)}`,
  );
});

await scenario('first-run onboarding can be skipped and replayed', async () => {
  await page.goto('about:blank');
  await page.goto(ORIGIN + '/');
  await page.waitForSelector('.onboarding-dialog');
  const welcome = await page.locator('.onboarding-dialog').innerText();
  check('first visit shows the Vectora welcome modal', welcome.includes('Welcome to Vectora') && welcome.includes('Ian Mattas'));
  await page.getByRole('button', { name: 'Skip onboarding' }).click({ timeout: 3000 });
  check('skip onboarding closes the modal', await page.locator('.onboarding-dialog').isHidden());
  const closedState = await page.evaluate(() => ({
    open: document.querySelector<HTMLDialogElement>('.onboarding-dialog')?.open,
    help: !!document.querySelector('#onboarding-help'),
    focusedHelp: document.activeElement?.id === 'onboarding-help',
  }));
  check('onboarding leaves the help control available', !closedState.open && closedState.help, JSON.stringify(closedState));
  check('closing onboarding restores launcher focus', closedState.focusedHelp, JSON.stringify(closedState));
  await page.evaluate(() => (document.querySelector('#onboarding-help') as HTMLButtonElement).click());
  const reopened = await page.evaluate(() => document.querySelector<HTMLDialogElement>('.onboarding-dialog')?.open === true);
  check('help reopens onboarding', reopened);
  const labels = await page.evaluate(() => {
    const dialog = document.querySelector<HTMLDialogElement>('.onboarding-dialog');
    return { labelled: dialog?.getAttribute('aria-labelledby') === 'onboarding-title', described: dialog?.getAttribute('aria-describedby') === 'onboarding-body' };
  });
  check('onboarding exposes dialog labels', labels.labelled && labels.described, JSON.stringify(labels));
  const primary = page.locator('.onboarding-dialog[open] .onboarding-primary');
  await primary.click({ timeout: 3000 });
  const progress = await page.locator('.onboarding-progress').evaluate(el => ({
    role: el.getAttribute('role'),
    min: el.getAttribute('aria-valuemin'),
    max: el.getAttribute('aria-valuemax'),
    now: el.getAttribute('aria-valuenow'),
  }));
  check('onboarding exposes progress semantics', progress.role === 'progressbar' && progress.min === '1' && progress.max === '4' && progress.now === '1', JSON.stringify(progress));
  for (let i = 0; i < 3; i++) await primary.click({ timeout: 3000 });
  check('onboarding reaches the final step', await page.getByRole('button', { name: 'Finish' }).isVisible());
  await primary.click({ timeout: 3000 });
  check('completed onboarding closes the modal', await page.locator('.onboarding-dialog').isHidden());
});

await scenario('help search and theme controls work', async () => {
  await page.goto(ORIGIN + '/help/');
  await page.waitForSelector('#help-search');
  await page.locator('#help-search').fill('tangent');
  const filtered = await page.evaluate(() => ({
    visible: [...document.querySelectorAll<HTMLElement>('.help-section')].filter(section => !section.hidden).map(section => section.id),
    status: document.querySelector('#search-status')?.textContent,
  }));
  await page.locator('#help-theme-toggle').click();
  const themed = await page.evaluate(() => ({
    theme: document.documentElement.dataset.theme,
    label: document.querySelector('#help-theme-toggle')?.getAttribute('aria-label'),
  }));
  check('Help search filters sections and announces the result', filtered.visible.includes('geometry') && filtered.status === '1 matching help section.', JSON.stringify(filtered));
  check('Help theme control updates the document theme', themed.theme === 'dark' && themed.label === 'Switch to light mode', JSON.stringify(themed));
});

await scenario('mobile sheet closes with Escape and restores focus', async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(ORIGIN + '/#y=x');
  await page.waitForSelector('#mobile-panel-toggle');
  await page.locator('#equations').focus();
  await page.keyboard.press('Escape');
  const state = await page.evaluate(() => ({
    collapsed: document.querySelector('#panel')?.classList.contains('mobile-collapsed'),
    focused: document.activeElement?.id === 'mobile-panel-toggle',
    expanded: document.querySelector('#mobile-panel-toggle')?.getAttribute('aria-expanded'),
  }));
  check('mobile Escape collapses the sheet and returns focus', state.collapsed === true && state.focused === true && state.expanded === 'false', JSON.stringify(state));
  await page.setViewportSize({ width: 1000, height: 700 });
});

await scenario('panel resize splitter supports keyboard bounds and reset', async () => {
  await page.setViewportSize({ width: 1000, height: 700 });
  await page.goto(ORIGIN + '/#y=x');
  await page.waitForSelector('#panel-resize');
  await page.evaluate(() => localStorage.removeItem('eq-panel-width'));
  await page.reload();
  const handle = page.locator('#panel-resize');
  const initial = await handle.getAttribute('aria-valuenow');
  await handle.focus();
  await page.keyboard.press('Home');
  const minimum = await handle.getAttribute('aria-valuenow');
  await page.keyboard.press('End');
  const maximum = await handle.getAttribute('aria-valuenow');
  await page.keyboard.press('Enter');
  const reset = await handle.getAttribute('aria-valuenow');
  check('panel splitter exposes bounds and reset behavior', initial !== null && minimum === '220' && Number(maximum) > 220 && reset === initial, JSON.stringify({ initial, minimum, maximum, reset }));
});

await scenario('the editor uses the technical type scale', async () => {
  await page.setViewportSize({ width: 1000, height: 700 });
  await page.goto(ORIGIN + '/#y=x');
  await page.waitForSelector('#sidebar-actions');
  const state = await page.evaluate(() => ({
    editorFont: getComputedStyle(document.querySelector('#equations')!).fontFamily,
    headerFont: getComputedStyle(document.querySelector('#panel-header .brand')!).fontFamily,
  }));
  check('editor uses the deliberate technical font stack', /Inter/i.test(state.editorFont) && /Inter/i.test(state.headerFont), JSON.stringify(state));
});

await scenario('blurred equations use visual math glyphs', async () => {
  await load(page, ['sqrt(x) * x']);
  await page.locator('.eq-line').first().click();
  await page.locator('#settings-tab').click();
  const state = await page.evaluate(() => {
    const row = document.querySelector<HTMLElement>('.eq-line')!;
    const source = row.querySelector<HTMLElement>('.math-source')!;
    return {
      focused: row.classList.contains('focused'),
      sourceDisplay: getComputedStyle(source).display,
      preview: row.querySelector<HTMLElement>('.math-preview')?.textContent,
      root: row.querySelector('.math-root') !== null,
    };
  });
  check('blurred equations use visual math glyphs', state.focused === false && state.sourceDisplay === 'none' && state.preview?.includes('√') === true && state.preview?.includes('×') === true && state.root, JSON.stringify(state));
});

await scenario('typed math aliases open editable templates', async () => {
  await load(page, ['x=0']);
  await caretTo(page, 0, 0);
  await page.keyboard.type('sqrt');
  const state = await page.evaluate(() => ({
    text: document.querySelector<HTMLElement>('.math-source')?.textContent,
    caret: (() => {
      const selection = getSelection();
      if (!selection?.focusNode) return -1;
      const row = document.querySelector<HTMLElement>('.eq-line')!;
      const range = document.createRange();
      range.selectNodeContents(row);
      range.setEnd(selection.focusNode, selection.focusOffset);
      return range.toString().length;
    })(),
  }));
  check('typed sqrt opens a canonical template with the caret inside', state.text?.startsWith('sqrt()') === true && state.caret === 5, JSON.stringify(state));
});

await scenario('add menu supports keyboard navigation and exposes its relationship', async () => {
  await page.goto(ORIGIN + '/#y%3Dx');
  const trigger = page.locator('.add-menu-trigger');
  await trigger.focus();
  await page.keyboard.press('Enter');
  const first = await page.evaluate(() => document.activeElement?.textContent?.trim());
  await page.keyboard.press('ArrowDown');
  const second = await page.evaluate(() => document.activeElement?.textContent?.trim());
  const state = await page.evaluate(() => ({
    controls: document.querySelector('.add-menu-trigger')?.getAttribute('aria-controls'),
    role: document.activeElement?.getAttribute('role'),
  }));
  check('add menu supports keyboard navigation and exposes its relationship', first === 'Expression' && second === 'Point' && !!state.controls && state.role === 'menuitem', JSON.stringify({ first, second, ...state }));
  await page.keyboard.press('Escape');
});

await scenario('sidebar tabs switch between main and graph settings', async () => {
  await page.goto(ORIGIN + '/#y%3Dx');
  await page.locator('#settings-tab').click();
  const settingsFocus = await page.evaluate(() => document.activeElement?.textContent?.trim());
  const settingsOpen = await page.evaluate(() => ({
    panel: document.querySelector<HTMLElement>('#panel')?.dataset.tab,
    selected: document.querySelector('#settings-tab')?.getAttribute('aria-selected'),
    themes: document.querySelectorAll('#settings-panel select[aria-label="Theme"] option').length,
    categories: [...document.querySelectorAll<HTMLDetailsElement>('.settings-category')].map(node => node.open),
  }));
  await page.locator('#main-tab').click();
  const mainOpen = await page.evaluate(() => ({
    panel: document.querySelector<HTMLElement>('#panel')?.dataset.tab,
    selected: document.querySelector('#main-tab')?.getAttribute('aria-selected'),
    settingsHidden: document.querySelector<HTMLElement>('#settings-panel')?.hidden,
    settingsDisplay: getComputedStyle(document.querySelector<HTMLElement>('#settings-panel')!).display,
  }));
  await page.keyboard.press('Escape');
  check('settings tab exposes styled settings controls and themes', settingsOpen.panel === 'settings' && settingsOpen.selected === 'true' && settingsOpen.themes === 3 && settingsOpen.categories.every(open => !open) && settingsFocus === 'Appearance', JSON.stringify({ ...settingsOpen, settingsFocus }));
  check('main tab hides every settings control', mainOpen.panel === 'main' && mainOpen.selected === 'true' && mainOpen.settingsHidden === true && mainOpen.settingsDisplay === 'none', JSON.stringify(mainOpen));
  await page.locator('#settings-tab').click();
  const panelBounds = await page.locator('#settings-panel').boundingBox();
  const selectStyle = await page.locator('#settings-panel select[aria-label="Angle units"]').evaluate(el => getComputedStyle(el).appearance);
  check('settings tab uses the sidebar layout and styled controls', !!panelBounds && selectStyle === 'none', JSON.stringify({ panelBounds, selectStyle }));
  await page.locator('.settings-category').nth(2).locator('summary').click();
  const categories = await page.locator('.settings-category').evaluateAll(nodes => nodes.map(node => (node as HTMLDetailsElement).open));
  check('settings categories expand and retract independently', categories.length === 3 && categories[2] === true, JSON.stringify(categories));
  await page.locator('#main-tab').click();
  await load(page, ['y = x']);
  await page.locator('.symbol-keyboard-trigger').click();
  await page.locator('.symbol-keyboard-close').click();
  const keyboardClosed = await page.evaluate(() => document.querySelector<HTMLElement>('.symbol-keyboard-popover')?.hidden);
  check('symbol keyboard close button works', keyboardClosed === true, String(keyboardClosed));
});

await scenario('animated named points keep angle readouts live', async () => {
  await page.goto(ORIGIN + '/#' + [
    'A = (cos(t), sin(t))',
    'B = (0, 0)',
    'C = (1, 0)',
    'angle(A, B, C)',
  ].map(encodeURIComponent).join(';'));
  await page.waitForTimeout(250);
  const state = await page.evaluate(() => ({
    readout: document.querySelector('#geometry-readouts')?.textContent ?? '',
    errors: [...document.querySelectorAll('.eq-error')].map(el => el.textContent),
  }));
  check('animated named points keep angle readouts live', /Angle:/i.test(state.readout) && state.errors.length === 0, JSON.stringify(state));
});

await scenario('graph canvas supports keyboard navigation', async () => {
  await page.goto(ORIGIN + '/#y%3Dx');
  await page.waitForSelector('#gl');
  const canvas = page.locator('#gl');
  const before = await page.evaluate(() => (globalThis as { __eq?: { view?: { upp: number } } }).__eq?.view?.upp ?? 0);
  await canvas.focus();
  await page.keyboard.press('Equal');
  const afterZoom = await page.evaluate(() => (globalThis as { __eq?: { view?: { upp: number } } }).__eq?.view?.upp ?? 0);
  const state = await page.evaluate(() => ({
    tabIndex: document.querySelector('#gl')?.getAttribute('tabindex'),
    role: document.querySelector('#gl')?.getAttribute('role'),
    shortcuts: document.querySelector('#gl')?.getAttribute('aria-keyshortcuts'),
    overlayHidden: document.querySelector('#overlay')?.getAttribute('aria-hidden'),
    focused: document.activeElement?.id === 'gl',
  }));
  check('graph canvas supports keyboard navigation', state.tabIndex === '0' && state.role === 'img' && state.shortcuts?.includes('Home') === true && state.overlayHidden === 'true' && state.focused && afterZoom < before, JSON.stringify({ before, afterZoom, ...state }));
});

await scenario('SVG export creates a named download', async () => {
  await load(page, ['y = sin(x)']);
  const download = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Save the current graph as an SVG file' }).click(),
  ]).then(([result]) => result);
  check('SVG export creates a named download', download.suggestedFilename() === 'vectora-graph.svg', download.suggestedFilename());
});

await scenario('browser runtime stays error-free', async () => {
  check('browser runtime stays error-free', runtimeErrors.length === 0, runtimeErrors.slice(0, 3).join(' | '));
});

await browser.close();
server.kill();

const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length) process.exit(1);
