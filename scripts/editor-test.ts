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
    activeEditor: document.activeElement?.id === 'equations',
  }));
  check('color picker opens on a focused swatch', opened.hidden === false && opened.active === 'color-swatch', JSON.stringify(opened));
  check('color picker Escape closes and returns focus', closed.hidden === true && closed.activeEditor, JSON.stringify(closed));
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
  const closedState = await page.evaluate(() => ({ open: document.querySelector<HTMLDialogElement>('.onboarding-dialog')?.open, help: !!document.querySelector('#onboarding-help') }));
  check('onboarding leaves the help control available', !closedState.open && closedState.help, JSON.stringify(closedState));
  await page.evaluate(() => (document.querySelector('#onboarding-help') as HTMLButtonElement).click());
  const reopened = await page.evaluate(() => document.querySelector<HTMLDialogElement>('.onboarding-dialog')?.open === true);
  check('help reopens onboarding', reopened);
  const primary = page.locator('.onboarding-dialog[open] .onboarding-primary');
  await primary.click({ timeout: 3000 });
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
  check('mobile Escape collapses the sheet and returns focus', state.collapsed && state.focused && state.expanded === 'false', JSON.stringify(state));
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

await browser.close();
server.kill();

const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length) process.exit(1);
