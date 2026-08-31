# Vectora

Vectora is a browser-first graphing studio with a symbolic math engine. Type
equations and see 2D curves, inequalities, vector fields, ODEs, probability
density, complex functions, and 3D surfaces rendered with WebGL.

The app is static: it has no account, server, API, or domain requirement.
Every graph is encoded in the URL, so the address bar is the share button.

## Structure

- `src/math/` — tokenizer, parser, symbolic algebra, plotting, and solving.
- `src/components/` — graph renderer, sidebar controls, symbol keyboard, and theme.
- `src/ui/` — browser entrypoint, application markup, styles, and `/help/` reference.
- `public/` — static icons, deployment headers, and install metadata.
- `scripts/` — local icon, editor, and performance tooling.

## Development

```sh
pnpm web          # start the Vite dev server
pnpm test         # run the math and component test suite
pnpm typecheck    # check math, components, and UI
pnpm web:build    # build the static site into dist-web/
```

The production build includes the install manifest and public assets adapted
from the upstream Equation.io web project. `pnpm icons` regenerates icon PNGs
from `public/icon.svg`.

## Graph links

Use `/g/<encoded equations separated by semicolons>` for a path-based graph
or `/#<same payload>` for a fragment link. Equations are percent-encoded by
the shared link codec in `src/math/link.ts`. The left Vectora sidebar keeps
the equation list editable while the canvas owns pan, zoom, and orbit input.

## License

MIT — see [LICENSE](LICENSE).
