# Vectora repository audit — 2026-08-31

## Scope and evidence

This review covers every tracked source, test, configuration, documentation,
and script file currently present under `D:\vectora`. Generated dependencies,
`node_modules`, and build output are excluded from source findings. Baseline
checks were run with Node 24.19.0 and the installed tool binaries:

- TypeScript: passed for both the math and UI projects.
- Vitest: 26 files and 541 tests passed.
- Vite production build: passed; 50 modules transformed.
- Browser editor smoke test: 11/13 passed.

## Confirmed findings

### F-001 — Normal editor input can leave the share URL stale

- Severity: high; user-visible correctness issue.
- Evidence: `scripts/editor-test.ts` reports `typing syncs state to the URL`
  with `/g/y = x` after changing the row to `y = x^2`.
- Cause: `saveUrl()` intentionally waits up to one second after a previous
  write, and transient incomplete syntax could throw from the row Solve-menu
  probe before URL persistence was reached. The initial hash canonicalization
  starts that timer, so a user edit immediately after load was not reflected
  in the address bar.
- Fix: ordinary editor input flushes the pending URL write immediately;
  high-frequency slider/drag updates retain coalescing. The Solve-menu probe
  now treats incomplete editor syntax as “not solvable” instead of throwing.

### F-002 — Row controls can be mistaken for equation text

- Severity: high; can corrupt editor state on native edits/copy operations.
- Evidence: the collapse smoke test sees `y=3⋮HideDuplicateRemove` as the row
  text. `lineText()` removes `.eq-widget` elements but not the
  `.row-options-wrap` that contains the trigger and menu.
- Fix: strip row option wrappers anywhere equation text is read from the DOM;
  the browser test helper uses the same semantic row-text boundary.

### F-003 — Declared static assets and gallery entry point are absent

- Severity: high for release/deployment completeness.
- Evidence: `public/` does not exist, while `index.html`, `about.ts`,
  `scripts/icons.ts`, `scripts/screenshots.ts`, and `README.md` reference
  icons, manifest, `llms.txt`, OG/gallery screenshots, and `/about/`.
- Impact: install metadata and social preview URLs 404; the icon generator
  fails before doing work; no `/about/` HTML entry is included in the build.
- Fix: add the required static metadata/icon source, add the about HTML entry,
  include it in the Vite multi-page input, and generate the documented PNG
  screenshot assets.

## File-by-file review ledger

Every file was inspected and assigned a disposition. “No confirmed defect”
means the current type/test/build evidence did not prove a bug; the listed
improvement is a follow-up opportunity, not a fabricated failure.

### Application and UI

| File | Disposition | Improvement / finding |
|---|---|---|
| `src/ui/main.ts` | F-001, F-002 | Split URL timing and DOM text extraction from this 3,072-line orchestration file in a future bounded refactor; add browser coverage for native typing with widgets present. |
| `src/ui/index.html` | F-003 | Add release assets and verify metadata URLs in a built-site smoke test. The viewport intentionally prioritizes graph gestures, but accessibility zoom should remain documented. |
| `src/ui/style.css` | No confirmed defect | Add automated contrast checks and responsive layout screenshots. |
| `src/components/theme.ts` | No confirmed defect | Guard storage/meta writes consistently if storage is unavailable; current code already catches startup storage failures. |
| `src/components/panel-resize.ts` | No confirmed defect | Add keyboard and touch browser coverage; persist-width clamping deserves a narrow unit test. |
| `src/components/button/button.ts` | No confirmed defect | Consider typed `HTMLButtonElement` return metadata for callers. |
| `src/components/color-picker/color-picker.ts` | No confirmed defect | Add Escape/focus-return behavior and keyboard selection for accessibility. |
| `src/components/expression-row/expression-row.ts` | F-002 contributor | Keep controls outside semantic equation text, or centralize DOM-to-text extraction. |
| `src/components/sidebar/sidebar.ts` | No confirmed defect | Currently a thin export; can be removed only in a deliberate module-boundary cleanup. |
| `src/components/sidebar/index.ts` | No confirmed defect | Barrel is unused by the current entrypoint; verify public API intent before removing. |
| `src/components/sidebar/add-menu.ts` | No confirmed defect | Add focus management for the popover. |
| `src/components/graph/gl.ts` | No confirmed defect | Add shader compile/link failure diagnostics surfaced to users. |
| `src/components/graph/mat4.ts` | No confirmed defect | Add singular-matrix and degenerate-camera tests. |
| `src/components/graph/render2d.ts` | No confirmed defect | GPU resource lifecycle and context-loss recovery need browser coverage. |
| `src/components/graph/render3d.ts` | No confirmed defect | Ray-march quality/performance varies by GPU; add a context-loss/low-capability fallback. |
| `src/components/geometry/overlay.ts` | No confirmed defect | Verify label clipping and DPR behavior with screenshots. |
| `src/components/geometry/hit-testing.ts` | No confirmed defect | Polygon empty-array behavior currently relies on `Math.min(...[])`; return an explicit miss if empty polygons become parseable. |
| `src/components/geometry/measurement-panel.ts` | No confirmed defect | Add accessible live-region semantics for changing measurements. |
| `src/components/geometry/angle-arc.ts` | No confirmed defect | Reflex-angle and wraparound behavior has focused tests; add zero-length endpoint cases at the parser boundary. |
| `src/components/geometry/angle-arc.test.ts` | No confirmed defect | Coverage is intentionally small; add reflex and ±π regression cases. |

### Math engine and language

| File | Disposition | Improvement / finding |
|---|---|---|
| `src/math/lang/tokenizer.ts` | No confirmed defect | Expand malformed Unicode/operator diagnostics. |
| `src/math/lang/parser.ts` | No confirmed defect | Add precedence/property tests for chained inequalities and piecewise syntax. |
| `src/math/lang/ast.ts` | No confirmed defect | Keep as the central discriminated-union contract. |
| `src/math/expr.ts` | No confirmed defect | Large evaluator/transform module; add differential CPU/GLSL tests for edge-domain functions. |
| `src/math/complex.ts` | No confirmed defect | Add overflow/branch-cut examples to tests and user diagnostics. |
| `src/math/glsl.ts` | No confirmed defect | CPU/GLSL semantic parity is a key risk; add generated shader compile smoke tests. |
| `src/math/defs.ts` | No confirmed defect | Dependency cycles and definition error reporting deserve explicit tests. |
| `src/math/plot.ts` | No confirmed defect | Add classification ambiguity tests for vector/complex/implicit rows. |
| `src/math/poly.ts` | No confirmed defect | Numeric conditioning and high-degree limits need documented bounds. |
| `src/math/roots.ts` | No confirmed defect | Pole-vs-root and tangential-root heuristics need adversarial tests. |
| `src/math/solve.ts` | No confirmed defect | Add convergence-failure reason reporting instead of only an empty result. |
| `src/math/formula.ts` | No confirmed defect | Expand singular and underdetermined-system behavior documentation. |
| `src/math/integrate.ts` | No confirmed defect | Long numerical module; add cancellation and discontinuity regression cases. |
| `src/math/dist.ts` | No confirmed defect | Large probability module; add tail/normalization error diagnostics and performance limits. |
| `src/math/seq.ts` | No confirmed defect | Add explicit bounds/overflow behavior for long recurrences. |
| `src/math/state.ts` | No confirmed defect | Silent fallback-to-zero paths should expose row-level diagnostics where possible. |
| `src/math/curve3d.ts` | No confirmed defect | Add degenerate tangent/frame tests and GPU/CPU sample budget telemetry. |
| `src/math/grid.ts` | No confirmed defect | Add extreme-span spacing tests. |
| `src/math/view.ts` | No confirmed defect | Preserve query parameters when canonicalizing URLs if deployments add them. |
| `src/math/link.ts` | No confirmed defect | Add malformed percent-encoding and very large payload limits. |
| `src/math/statements.ts` | No confirmed defect | Confirm separator semantics against copy/paste and URL documentation. |
| `src/math/geometry.ts` | No confirmed defect | Add validation for degenerate geometry at parse/classification time. |
| `src/math/geometry-analysis.ts` | No confirmed defect | Add mixed-row and unsupported-form diagnostics. |
| `src/math/measurements.ts` | No confirmed defect | Centralize number formatting with the UI formatter. |
| `src/math/intersections.ts` | No confirmed defect | Add near-tangent and coincident-curve behavior tests. |
| `src/math/drag.ts` | No confirmed defect | Add round-trip tests for named points and axis bounds. |
| `src/math/special.ts` | No confirmed defect | Root display heuristics need adversarial false-positive tests. |

### Tests, tooling, and documentation

| File | Disposition | Improvement / finding |
|---|---|---|
| `src/math/*.test.ts` | No confirmed defect | 26 suites/541 tests pass; broaden edge and differential coverage per the math ledger. |
| `src/math/perfcase.ts` | No confirmed defect | Keep performance fixtures deterministic and versioned with baseline changes. |
| `src/math/perf.bench.ts` | No confirmed defect | Add a CI-friendly threshold mode distinct from exploratory benchmarks. |
| `src/math/perf-smoke.test.ts` | No confirmed defect | Current smoke gate is useful; report operation names on failure. |
| `src/math/perf-guards.test.ts` | No confirmed defect | Add explicit regression explanations for each guard. |
| `scripts/editor-test.ts` | F-001, F-002 test coverage | Fix semantic row extraction and retain the URL regression test. The script also emits a Node child-process deprecation warning. |
| `scripts/screenshots.ts` | F-003 dependency | Fail early with a clear message when icon/gallery prerequisites are absent; generated assets now satisfy the contract. |
| `scripts/icons.ts` | F-003 dependency | Requires `public/icon.svg`; asset source is added. |
| `scripts/perf.ts` | No confirmed defect | Add cleanup/failure handling if the spawned dev server exits early. |
| `scripts/perf-baseline.json` | No confirmed defect | Document hardware/browser provenance beside baseline data. |
| `src/pages/about/showcase.ts` | F-003 dependency | Data and link codec are coherent; the page needs a built HTML entry and static shots. |
| `src/pages/about/about.ts` | F-003 dependency | Safe DOM construction; add an empty-gallery fallback. |
| `src/pages/about/about.css` | F-003 dependency | Currently unreachable from the production input until the about entry is added. |
| `package.json` | No confirmed defect | `pnpm` scripts are correct for the project, but local tooling should document the approved-build-script requirement. |
| `pnpm-lock.yaml` | No confirmed defect | Lockfile is current; do not hand-edit. |
| `tsconfig.json` | No confirmed defect | Strict math config passes. |
| `src/ui/tsconfig.json` | No confirmed defect | Strict UI config passes. |
| `vite.config.ts` | F-003 | Add the about page as a second multi-page build input. |
| `vitest.config.ts` | No confirmed defect | Math-only inclusion is deliberate; browser editor tests run separately. |
| `README.md` | F-003 documentation gap | Document the about page/assets and the direct binary fallback when pnpm shims are unavailable. |

## Remaining risks

The audit did not claim runtime proof for every GPU path, mobile browser, screen
reader, or every numerical edge case. Those require dedicated environments or
additional test fixtures. The fixes below address the confirmed release and
editor failures without broad architectural rewrites.

## Resolution and final verification

F-001, F-002, and F-003 are resolved in the workspace. Final fresh checks:

- `tsc --noEmit` and `tsc -p src/ui --noEmit`: passed.
- Vitest: 26 files, 541 tests passed.
- Vite build: passed; `dist-web/index.html` and `dist-web/about/index.html`
  are emitted, with 53 modules transformed.
- Browser editor smoke test: 13/13 scenarios passed.
- Static asset check: all required icon, manifest, `llms.txt`, and hero asset
  paths present.
- `node scripts/icons.ts`: generated all four install icon sizes.
- `node scripts/screenshots.ts`: generated 43 showcase/hero PNG assets.

The Vite tooling now spawns through Node directly, avoiding the Windows
`[DEP0190]` warning. A stale Vite process on a test port still needs to be
stopped before a clean smoke run.

## Second-pass resolutions

The following previously documented opportunities were also implemented:

- Malformed percent-encoded links now remain editable instead of aborting boot.
- URL canonicalization preserves deployment query parameters.
- Empty polygon hit tests return an explicit miss.
- Pole-on 3D camera orientation uses a fallback up vector and stays finite.
- Vitest now includes component regression files instead of math tests only.
- Color choices expose option semantics and selected state; add-menu Escape
  closes the menu and restores focus.
- Geometry measurement updates expose a polite accessible status region.
- WebGL context loss shows a status message; context restoration reloads the
  current URL to rebuild invalidated GPU resources safely.
- Vite tooling scripts avoid the Windows `shell: true` child-process warning.

## Current product-surface update

After the second pass, the upstream public asset set from
`aantthony/equation.io/web/public` was adopted and rebranded for Vectora.
`llms.txt` and the About page were intentionally removed at the product
owner's request. The first-run Vectora onboarding modal, replayable Help
control, Examples menu activation, focus behavior, and 20-scenario browser
coverage were added. The production build now emits only the main app entry;
`dist-web/about/index.html` and `dist-web/llms.txt` are absent by design.
