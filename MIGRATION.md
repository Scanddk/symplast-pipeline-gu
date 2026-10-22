# Simulator — Desktop Transfer

A faithful migration of the existing static **React 18 + TypeScript** app
**Symplast Pipeline Guide** into this project. This is **not a redesign** — the
goal is to preserve the original behavior, content, and structure as closely as
the platform allows.

## Status

- **Verification status:** NC / draft (preserved from the source app — do not
  alter content or status markers during migration).
- **Scope:** minimal project shell + code editor workspace only. The actual
  migrated source files are provided separately and dropped into the layers
  below.
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
| `@fontsource/*`| **TBD**       | bundled fonts — install the specific packages when source is provided. |
| CSS Modules    | native (Vite) | no setup needed                                               |

## Next

Provide the migrated source files. They map to the layer directories above; the
root component is wired into `src/routes/index.tsx` (replacing
`MigrationPlaceholder`), and any `@fontsource` font packages are installed at
that time.