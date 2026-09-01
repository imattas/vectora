# Vectora Product Improvement Milestone Implementation Plan

**Goal:** Add the eight approved graphing-studio improvements while preserving current parser behavior, URL sharing, mobile support, and deployment.

**Architecture:** Keep mathematical evaluation canonical and local. Add reusable pure math helpers for intersections and point-of-interest generation, then expose them through the existing hover/overlay pipeline. Keep UI state in small modules for editor suggestions, graph settings, workspaces, and mobile presentation rather than expanding unrelated renderer code.

**Tech Stack:** TypeScript, Vite, Vitest, WebGL2, Canvas 2D overlay, contenteditable editor, localStorage, Playwright smoke tests.

## Global Constraints

- Preserve canonical expression text for parsing, undo/redo, URL sharing, and JSON export.
- Do not add a server or account requirement; workspaces remain local-first.
- Keep the dev server available on port 8080.
- Work directly on `main`; do not create branches or use subagents.
- Every behavior change gets a focused regression test before implementation and a browser check when it affects interaction.

---

### Task 1: Curve and dataset intersections

**Files:**
- Create: `src/math/point-of-interest.ts`
- Modify: `src/math/special.ts`, `src/ui/main.ts`
- Test: `src/math/point-of-interest.test.ts`, `src/math/special.test.ts`

**Interfaces:**
- Produce `findCurveIntersections(left: Expr, right: Expr, bounds: Bounds): SpecialPoint[]` for 2D implicit curves.
- Produce `polylineSpecialPoints(points, closed, xlo, xhi, ylo, yhi)` support for finite line/list data.
- UI consumes `SpecialPoint` candidates through the existing deferred cache and hover marker.

- [ ] Test crossing linear and nonlinear curves, tangent/no-crossing cases, duplicate roots, and bounds clipping.
- [ ] Test segment, polygon, parametric, point-list, and numeric-list axis candidates.
- [ ] Implement bounded numerical solving with deduplication and a work budget so pointer movement never runs a full solve synchronously.
- [ ] Merge candidates into the existing hover cache and prefer exact points over generic curve hover.
- [ ] Add click-to-pin, copy-coordinate action, and Escape/unhover behavior without changing drag-point behavior.
- [ ] Run focused math tests and browser hover/pin/copy checks.
- [ ] Commit `feat: add graph point-of-interest intersections`.

### Task 2: Structured math display and autocomplete

**Files:**
- Create: `src/components/math-editor/`, `src/components/function-autocomplete.ts`
- Modify: `src/ui/main.ts`, `src/ui/style.css`, `src/components/math-display.ts`
- Test: `src/components/math-editor/*.test.ts`, `src/components/function-autocomplete.test.ts`

**Interfaces:**
- Canonical source remains a string; editor display nodes serialize back to that string.
- Templates provide `insert`, `selection`, and optional nested-slot metadata for fraction, root, exponent, and function forms.

- [ ] Test caret-safe insertion of grouped fractions, roots, exponents, and function calls.
- [ ] Test completion filtering, keyboard navigation, Escape, and selection insertion.
- [ ] Replace visual-only fraction/root behavior with editable slots while retaining fallback text for unsupported fragments.
- [ ] Add autocomplete for supported parser functions/constants and geometry forms.
- [ ] Verify typing, paste, undo/redo, URL round-trip, and mobile editing.
- [ ] Commit `feat: add structured math editing and completion`.

### Task 3: Graph settings and expanded geometry

**Files:**
- Create: `src/components/graph-settings.ts`, `src/components/geometry/tools.ts`
- Modify: `src/ui/index.html`, `src/ui/main.ts`, `src/ui/style.css`, `src/components/graph/render2d.ts`, `src/components/geometry/overlay.ts`
- Test: `src/components/graph-settings.test.ts`, `src/components/geometry/tools.test.ts`

**Interfaces:**
- Settings state: `{ grid, axes, labels, points, snap, angleUnit }` persisted through a versioned local preference.
- Geometry tools produce pure `GeometryObject`/measurement values and never mutate equations without an explicit user action.

- [ ] Test settings defaults, persistence, reset, and radians/degrees formatting.
- [ ] Test tangent, perpendicular bisector, polygon area, midpoint labels, and angle/intersection annotations.
- [ ] Add a compact settings popover with accessible pressed states and reset control.
- [ ] Apply settings to grid, axes, labels, points, overlays, and measurements.
- [ ] Run geometry and render smoke checks in light/dark themes.
- [ ] Commit `feat: add graph settings and geometry tools`.

### Task 4: Mobile bottom sheet and accessibility

**Files:**
- Create: `src/components/mobile-sheet.ts`
- Modify: `src/ui/main.ts`, `src/ui/style.css`, `src/ui/index.html`, `src/components/symbol-keyboard.ts`
- Test: `src/components/mobile-sheet.test.ts`

**Interfaces:**
- Mobile sheet exposes `open()`, `close()`, `toggle()`, and `isOpen()` with pointer/keyboard-safe transitions.

- [ ] Test focus return, Escape close, reduced-motion behavior, and viewport-size breakpoints.
- [ ] Add a draggable/collapsible mobile expression sheet and persistent graph affordance.
- [ ] Ensure the keyboard, settings, and workspace menus remain within the visual viewport and safe-area insets.
- [ ] Add keyboard shortcut/help labels and verify tab order.
- [ ] Commit `feat: improve mobile graph workspace`.

### Task 5: Local workspaces

**Files:**
- Create: `src/state/workspaces.ts`, `src/components/workspace-menu.ts`
- Modify: `src/ui/main.ts`, `src/ui/index.html`, `src/ui/style.css`
- Test: `src/state/workspaces.test.ts`

**Interfaces:**
- `Workspace = { id, name, updatedAt, equations, view, settings }`.
- Storage functions: `listWorkspaces()`, `saveWorkspace()`, `loadWorkspace()`, `deleteWorkspace()`, `exportWorkspace()`, `importWorkspace()`.

- [ ] Test versioned serialization, malformed import rejection, recents ordering, duplicate names, and storage failure fallback.
- [ ] Add named save/open/recent workspace menu with confirmation for destructive deletion.
- [ ] Add JSON export/import and preserve current URL sharing as a separate path.
- [ ] Commit `feat: add local workspaces and JSON backup`.

### Task 6: Documentation and examples

**Files:**
- Modify: `src/ui/help/index.html`, `src/ui/help/help.css`, `src/ui/main.ts`
- Test: browser help navigation/search smoke test.

- [ ] Document curve intersections, point-of-interest hover/pin, settings, geometry tools, structured math entry, mobile gestures, and workspace backup.
- [ ] Add examples for line/curve intersections, arrays, tangents, and geometry measurements.
- [ ] Verify all help anchors and search result announcements.
- [ ] Commit `docs: expand Vectora help for new workflows`.

### Task 7: Integrated verification and deployment

**Files:**
- Modify only if verification finds a regression.

- [ ] Run all Vitest tests, both TypeScript checks, production build, and performance guard.
- [ ] Run Playwright checks for desktop, mobile, dark/light themes, keyboard, editor, intersections, settings, workspaces, import/export, and help search.
- [ ] Confirm port 8080 responds and the custom domain serves the deployed build.
- [ ] Confirm GitHub Pages workflow completes successfully.
- [ ] Commit any narrowly scoped verification fixes and report unresolved limitations explicitly.
