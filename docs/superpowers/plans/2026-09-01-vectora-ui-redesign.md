# Vectora UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce Vectora's visual clutter and generic dashboard styling while preserving calculator behavior and accessibility.

**Architecture:** Keep the existing HTML shell and TypeScript component boundaries. Remove workspace-only UI from `main.ts`, then tune the shared app stylesheet around a stronger type scale, quieter chrome, and one coherent editor toolbar.

**Tech Stack:** TypeScript, Vite, plain CSS, Vitest, Playwright-based editor scenarios.

**Spec:** `docs/superpowers/specs/2026-09-01-vectora-ui-redesign-design.md`

## Global Constraints

- No UI framework or new runtime dependency.
- No changes to parser, renderer, URL format, or graph interaction semantics.
- Workspace persistence UI and its unused application imports are removed.
- All controls retain accessible names and keyboard focus visibility.

---

### Task 1: Remove workspace management surface

**Files:**
- Modify: `src/ui/main.ts`
- Test: `scripts/editor-test.ts`

**Interfaces:**
- Consumes: existing `addActions` toolbar construction.
- Produces: a toolbar containing only calculator actions; no Save/Open/Backup/Recent/Delete workspace controls.

- [x] Remove workspace imports and the corresponding DOM construction.
- [x] Add browser assertions that workspace-management labels are absent.
- [x] Run the focused editor scenario.

### Task 2: Establish the quieter visual system

**Files:**
- Modify: `src/ui/style.css`
- Test: `scripts/editor-test.ts`

**Interfaces:**
- Consumes: existing theme variables, sidebar layout, and action classes.
- Produces: stable desktop/mobile visual hierarchy with no toolbar overlap.

- [x] Define explicit display/interface/mono font stacks and a restrained spacing scale.
- [x] Restyle the header, toolbar, expression rows, graph controls, and focus states without changing selectors used by TypeScript.
- [x] Add desktop and narrow viewport layout assertions for the header and toolbar.
- [x] Run typecheck, unit tests, build, and browser scenarios.

### Task 3: Commit and verify

**Files:**
- Modify: `docs/vectora-engineering-audit.md`

- [x] Record the removed workspace surface and visual-system change in the audit.
- [x] Run `git diff --check` and inspect the final diff.
- [ ] Commit the focused redesign.
