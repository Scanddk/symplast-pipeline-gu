import { lazy, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";

// Client-only host for the migrated Symplast Pipeline Guide.
//
// The original app is a static React 18 + TypeScript client app. On this
// platform it is mounted behind <ClientOnly> so the framework's SSR pass never
// evaluates browser-only code (localStorage, window, bundled fonts, etc.).
// The migrated application source lives under `src/app/` and is wired in here
// once provided. No database, auth, external APIs, analytics, tracking, or form
// submissions are involved — this is a pure client-only app.
const DesktopApp = lazy(() => import("../app/main"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Symplast Pipeline Guide" },
      {
        name: "description",
        content:
          "Symplast Pipeline Guide — a client-only interactive guide. Desktop transfer migration.",
      },
      { property: "og:title", content: "Symplast Pipeline Guide" },
      {
        property: "og:description",
        content:
          "Symplast Pipeline Guide — a client-only interactive guide. Desktop transfer migration.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <ClientOnly fallback={<ShellFallback />}>
      <Suspense fallback={<ShellFallback />}><DesktopApp /></Suspense>
    </ClientOnly>
  );
}

// Minimal SSR-safe fallback shown before hydration.
function ShellFallback() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-background px-4"
      aria-busy="true"
    >
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Symplast Pipeline Guide
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Loading…</p>
      </div>
    </div>
  );
}
