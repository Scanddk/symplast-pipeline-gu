# Simulator — Desktop Transfer

A faithful migration of the existing static **React 18 + TypeScript** app
**Symplast Pipeline Guide** into this project. This is **not a redesign** — the
goal is to preserve the original behavior, content, and structure as closely as
the platform allows.

## Status

- **Verification status:** NC / draft (preserved from the source app — do not
  alter content or status markers during migration).
- **Scope:** Desktop source integrated into the client-only Studio host.
  Original application files live in `src/app/`; content, engine, and schema
  remain separate top-level layers.
- **Publish/deploy:** intentionally not published or deployed.

## Client-only

This is a **client-only app**. It must not introduce any of:

- database / persistence
- authentication
- external APIs
- analytics or tracking
- form submissions / network writes

All state is in-memory or browser-local. SSR is kept inert: the migrated app is
mounted behind `<ClientOnly>` in `src/routes/index.tsx` so the platform's
server-side pass never evaluates browser-only code.

## Layer structure (kept separate)

The original app's layers are preserved as separate top-level directories:

```
content/
  rules/        # content/rules
  practices/    # content/practices
  scenarios/    # content/scenarios
  lessons/      # content/lessons
engine/         # engine layer
schema/        # schema layer (zod)
src/            # platform framework + client-only host
  app/          # migrated application source (the original app's `src` layer)
  routes/       # TanStack route shell (thin wrapper only)
  styles.css    # design tokens (Tailwind v4)
```

Each content/engine/schema layer stays independent. Do not fold them into the
framework `src/` tree.

## Wrapper changes (platform adaptation)

The platform scaffolds a **TanStack Start** app (SSR-capable). The migrated
client app is preserved as a client-only route with these minimal wrapper
adjustments — no replacement functionality is invented:

1. `src/routes/__root.tsx` — root HTML shell + `QueryClientProvider` +
   `<Outlet />`. Title/description/og metadata set to the app name (replacing
   the scaffold placeholder). No app logic lives here.
2. `src/routes/index.tsx` — the only content route. It renders the migrated app
   behind `<ClientOnly>` so SSR stays a no-op for app code. A SSR-safe fallback
   is shown before hydration.
3. `src/styles.css` — Tailwind v4 design tokens. The migrated app's own styling
   uses **CSS Modules** (`.module.css`), which Vite supports natively — no
   config change required.

## Dependencies

| Package        | Status        | Notes                                                        |
| -------------- | ------------- | ------------------------------------------------------------ |
| `motion`       | installed     | `motion/react` — used by the source app (successor to framer-motion). |
| `lucide-react` | present       | icons                                                         |
| `zod`          | present       | schema validation (schema layer)                             |
| `@fontsource/*`| installed     | bundled Hanken Grotesk, Inter, Space Grotesk, and Syne fonts |
| CSS Modules    | native (Vite) | no setup needed                                               |

## Validation and integration notes

- `npm test`: 64 tests pass; `npm run typecheck` passes.
- `npm run build`: client and SSR production bundles build successfully.
- `STRICT_CONTENT=true npm run build` intentionally rejects the existing NC/draft content.
- The original browser entry now exports a component; it does not create a second React root.
  The route lazily loads that component inside `ClientOnly` and `Suspense`.
- Relative imports account for `src` moving to `src/app`. Content, schemas, engine,
  practice overrides, and verification markers retain the Desktop source.
- The Studio React 19 host uses three ref-type adjustments. TypeScript remains strict,
  with optional-property/index-access settings aligned to the Desktop project.
- A scoped stylesheet preserves Desktop heading weights against Tailwind Preflight.
  URL changes happen outside React state updater functions to avoid router warnings.
- Existing Studio routing, cloud integration files, error handling, and commit history
  are retained. No application database/authentication features were added.
- Desktop-sized local QA covered the menu, lesson navigation, demo submission,
  chapter/card transitions, browser Back, practice setup, and view switching.
  Full mobile and 12-beat end-to-end equivalence remain unverified.

The Desktop source is the source of truth. Refresh it before any later transfer;
this integration does not modify the Desktop originals or the separate `symulator` repository.
