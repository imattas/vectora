# Vectora UI Redesign Design

## Goal

Make Vectora feel like a deliberate scientific instrument instead of a generic generated dashboard: the graph remains dominant, the expression editor gets the strongest hierarchy, and utility controls stop competing for attention.

## Design

- Keep the header identity-first: logo, Vectora wordmark, and a quiet subtitle; header controls remain compact and never compete with the editor.
- Remove local workspace management controls entirely. URL state and the existing graph controls remain unchanged.
- Use a tighter technical typography stack with explicit display, interface, and monospace roles, without adding a dependency.
- Replace the current collection of rounded bordered controls with a small number of grouped tool clusters, restrained separators, and clearer hover/focus states.
- Give the expression area more visual weight and make the Add/Clear/Save SVG/keyboard tools read as one editor toolbar.
- Preserve light/dark themes, mobile bottom-sheet behavior, keyboard accessibility, and all existing calculator semantics.

## Constraints

- No UI framework or new runtime dependency.
- No changes to parser, renderer, URL format, or graph interaction semantics.
- Workspace persistence UI and its unused application imports are removed.
- All controls retain accessible names and keyboard focus visibility.

## Validation

- Typecheck and production build.
- Existing unit suite.
- Existing editor browser scenarios, plus assertions that workspace controls are absent and the remaining toolbar is visible without overlap at desktop and mobile widths.
