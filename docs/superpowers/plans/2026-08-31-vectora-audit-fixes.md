# Vectora Audit Fixes Implementation Plan

> **For agentic workers:** Execute inline in this workspace; subagent delegation is unavailable.

**Goal:** Resolve the confirmed editor and release-surface defects found by the full repository audit.

**Architecture:** Keep the math/rendering architecture intact. Make URL flushing explicit at the editor boundary, centralize semantic extraction of equation text from decorated DOM rows, and add the missing Vite multi-page/static asset surface.

**Tech Stack:** TypeScript, Vite 8, Vitest 4, Playwright, static HTML/CSS/PNG/SVG assets.

**Spec:** `docs/audit/2026-08-31-repository-audit.md`

## Global Constraints

- Preserve the existing URL formats `/g/<payload>` and `/#<payload>`.
- Preserve slider/drag URL coalescing to avoid browser history API rate limits.
- Keep the math test suite and UI typecheck strict.
- Do not introduce a server, account, API, or runtime dependency.

---

### Task 1: Make semantic row text immune to UI controls

**Files:**
- Modify: `src/ui/main.ts`
- Modify: `scripts/editor-test.ts`

**Interfaces:**
- `lineText(line: HTMLElement): string` remains the single DOM-to-equation extraction boundary.

- [ ] Update `lineText` to remove both `.eq-widget` and `.row-options-wrap` descendants before reading text.
- [ ] Update the browser test `rowTexts` helper to remove those same non-equation controls.
- [ ] Run the editor smoke test and confirm the collapse scenario compares only equation content.

### Task 2: Flush ordinary edits immediately while retaining throttled visual edits

**Files:**
- Modify: `src/ui/main.ts`
- Test: `scripts/editor-test.ts`

**Interfaces:**
- `saveUrl(immediate?: boolean): void`; callers without the argument retain coalescing.

- [ ] Change `saveUrl` to accept `immediate`, cancel any pending timer, and call `flushUrl` for immediate editor edits.
- [ ] Call `saveUrl(true)` from the contenteditable `input` handler only.
- [ ] Keep slider, drag, viewport, and structural operations on the existing coalesced path.
- [ ] Run the editor smoke test and confirm the URL contains the edited equation immediately.

### Task 3: Restore the documented static/release surface

**Files:**
- Create: `public/icon.svg`
- Create: `public/manifest.webmanifest`
- Create: `public/llms.txt`
- Create: `src/ui/about/index.html`
- Modify: `vite.config.ts`
- Modify: `README.md`
- Generate: `public/apple-touch-icon.png`, `public/icon-192.png`, `public/icon-512.png`, `public/icon-maskable-512.png`, `public/shots/*.png`

**Interfaces:**
- `/about/` is a static Vite entry importing `src/pages/about/about.ts` and `about.css`.
- Existing `/shots/<slug>.png` and icon URLs remain stable.

- [ ] Add the SVG icon source and web app manifest with the existing Vectora name, start URL, colors, and icon sizes.
- [ ] Add `llms.txt` describing the static graph URL contract and capability boundary.
- [ ] Add the about HTML shell and configure it as a second Vite input.
- [ ] Run the icon and screenshot generators to produce the referenced static files.
- [ ] Build and verify the output contains both `index.html` and `about/index.html`.
- [ ] Update README structure/development notes to match the restored assets and page.

### Task 4: Final verification and report reconciliation

**Files:**
- Modify: `docs/audit/2026-08-31-repository-audit.md`

- [ ] Run math tests, both typechecks, the production build, editor smoke tests, and asset existence checks.
- [ ] Record actual results and any environment-only warnings in the audit report.
- [ ] Leave unresolved numerical/GPU/accessibility opportunities explicitly labeled as unverified follow-ups.
