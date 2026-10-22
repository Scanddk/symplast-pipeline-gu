# src/app

Migrated application source — the original Symplast Pipeline Guide `src` layer.

This holds the migrated app's components, hooks, and entry root component. It
is rendered client-only from `src/routes/index.tsx` (behind `<ClientOnly>`), so
browser-only code is never evaluated during the platform's SSR pass.

Keep this separate from the framework `src/routes/`, `src/lib/`, and
`src/components/ui/` (shadcn) directories. The content/engine/schema layers live
at the project root, not here.