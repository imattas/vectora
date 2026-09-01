# Vectora engineering audit

Updated: 2026-08-31

This document records the repository-level issues found during the improvement
pass, the corrective work applied, and the verification evidence. Canonical
expression text remains the source of truth for parsing, sharing, undo/redo,
workspace backups, and exports.

## Application shell and interaction

| Area | Finding | Resolution | Status |
| --- | --- | --- | --- |
| Expression rows | Native `contenteditable` paragraph splitting could create duplicate empty rows, especially after Enter, IME input, or paste. | Centralized newline insertion and DOM reconciliation in state space. | Fixed; covered by existing editor tests and browser smoke checks. |
| Expression preview | Visual math formatting could not identify which source fragment was clicked. | Preview nodes now carry canonical source ranges; clicks return to the matching source offset. | Fixed; manually verified. |
| Keyboard | Raw Unicode constants and incomplete operator templates produced parser-invalid insertions. | Keyboard emits parser-compatible canonical tokens and cursor-aware templates. | Fixed; 565-test suite green. |
| Keyboard selection actions | Fraction/root/power/function actions appended after selections instead of wrapping them. | Selection-aware wrapping with operand-slot caret placement. | Fixed; manually exercised. |
| Autocomplete | Suggestions had no keyboard navigation. | Added ArrowUp/ArrowDown, Tab, Enter, Escape, listbox semantics. | Fixed. |
| Onboarding | First-run orientation was missing. | Added welcome/development notice and onboarding flow with skip/start actions. | Fixed. |
| Mobile shell | Desktop sidebar layout reduced the graph viewport on narrow screens. | Added bottom-sheet presentation, swipe collapse/expand, safe-area spacing, and a non-overlapping toggle. | Fixed; manually verified at 390×844. |
| Header controls | Help, settings, theme, and onboarding controls could overlap. | Consolidated responsive header spacing and accessible labels. | Fixed. |

## Rendering and graph behavior

| Area | Finding | Resolution | Status |
| --- | --- | --- | --- |
| Grid setting | Disabling the grid returned from the renderer before plot layers were drawn. | Grid drawing is now conditional; plot layers always continue. | Fixed. |
| Axes | Grid and axes were coupled. | Added independent persisted axis visibility and renderer support. | Fixed. |
| Theme | Graph and logo colors needed to follow light/dark theme state. | Theme synchronization covers graph, controls, logo assets, and labels. | Fixed. |
| SVG export | WebGL completion and overlay geometry were not guaranteed in the captured output. | Call `gl.finish()`, preserve sampled polylines/points as SVG primitives, and sample multiple implicit branches at export time, retaining a raster fallback for unsupported shader-only layers. | Improved; implicit curves now export as branch-separated vector polylines, with raster fallback retained for unsupported layers. |
| Fast measurement updates | Variable-height readouts could cause layout movement. | Fixed-height measurement region with internal scrolling and stable text layout. | Fixed. |
| Curves and shapes | Several geometry forms were parsed but not reliably represented by the overlay analyzer. | Added normalized circle arguments, polygon area/perimeter readouts, tangents, and perpendicular bisectors. | Fixed for supported forms. |
| Angle annotations | Crossing line equations did not automatically show angle arches; units were inconsistent. | Added automatic crossing-angle derivation and synchronized degrees/radians labels in panels and arches. | Fixed. |
| Point of interest | Axis intercepts and intersections were difficult to discover and could be hidden by generic curve hover. | Added deferred special-point caches, hover markers, pinning, coordinate copy, axis candidates for finite data, and nonlinear curve intersections. | Fixed for bounded numerical candidates. |

## Math and geometry coverage

- Numeric scalar expressions such as `9x30/64` continue through the ordinary
  evaluator/solver path.
- Visual formatting covers comparison glyphs, multiplication/division glyphs,
  constants, powers, stacked fractions, square roots, cube roots, and absolute values while
  preserving canonical source text.
- `cbrt(x)` evaluates real cube roots for negative inputs, differentiates
  symbolically, compiles to WebGL, and displays as `³√x`.
- `nroot(value, index)` supports arbitrary nonzero integer indexes, rejects
  even roots of negative values, and is available from the calculator keyboard.
- `perpendicularBisector(A, B)` and
  `tangent(circle(O, r), P)` validate degenerate or off-circle inputs and
  produce line overlays.
- Nonlinear curve intersections use bounded deterministic Newton seeds,
  deduplication, clipping, and an evaluation budget. The seed lattice is
  x-oriented so dense oscillatory crossings receive enough independent starts;
  results are computed from idle work rather than pointer handlers.
- Formatted previews are explicitly non-editable and editor automation targets
  the canonical source text node, preventing preview glyphs from being inserted
  or counted as duplicate equation content.

## Persistence and documentation

| Area | Finding | Resolution | Status |
| --- | --- | --- | --- |
| Workspaces | Local save/open existed only as prompt-driven actions and lacked recents/deletion. | Added versioned local storage, recent selector, deletion confirmation, JSON backup import/export, and load API. | Fixed. |
| Backup validation | Malformed records could enter storage with unsafe field shapes. | Validate records, timestamps, and equation strings during import. | Fixed. |
| Installed app shell | The manifest made Vectora installable, but a cold offline launch had no cached shell. | Added a versioned service worker with cached shell assets, network-first navigation, and offline fallback. | Fixed; `dist-web/sw.js` verified. |
| Help | New geometry, keyboard, point-of-interest, settings, mobile, and workspace flows were under-documented. | Expanded Help with About, Features, syntax, troubleshooting, controls, and examples. | Fixed. |
| Repository hygiene | License and Pages/custom-domain deployment artifacts were required. | Added `LICENSE`, Pages workflow, and custom-domain configuration; removed requested `llms.txt` and About page. | Fixed. |

## Verification evidence

The current implementation has repeatedly passed:

```text
vitest: 37 files, 570 tests passed
npm run typecheck: passed
npm run web:build: passed
npm run test:editor: 20 scenarios passed
git diff --check: passed
http://localhost:8080/: HTTP 200
GitHub Pages workflow: successful on prior pushed revisions
```

Manual browser checks covered onboarding dismissal, settings controls,
nonlinear/axis point hover, pinned coordinate copy, mobile sheet collapse,
mobile keyboard insertion, semantic preview navigation, and responsive canvas
width.

## Known limitations and follow-up work

1. The editor still stores one canonical string per row; the visual math tree
   is semantic for navigation but is not yet a fully nested native math-field
   with independent numerator, denominator, exponent, and radicand DOM slots.
2. Unsupported shader-rendered layers in SVG require a raster fallback. The
   common 2D implicit-curve path, overlays, points, and geometry are emitted as
  vector primitives, including an orthogonal fallback for vertical loci;
  export-time Newton sampling remains an approximation.
3. Numerical curve intersections can still miss singular, tangent, or very
   closely spaced roots outside the bounded seed/evaluation budget; exact
   coverage would require a more expensive adaptive subdivision pass.
4. Workspace import/export is local-first and intentionally has no account or
   server synchronization layer.

These limitations are explicit so passing tests and deployment checks are not
mistaken for proof of unsupported behavior.
