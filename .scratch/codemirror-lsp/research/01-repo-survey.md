# Repo architecture, playground, and Effect setup

This survey documents the repository facts that constrain a CodeMirror 6 + TypeScript LSP editor in `apps/web`.

## Framework, rendering, and client JS

- **Astro and integrations.** `apps/web/package.json` runs `astro` `^7.4.5` with `@astrojs/react` `^7.1.2`, `@astrojs/mdx` `^8.1.2`, `astro-expressive-code` `^0.44.3`, and `react` / `react-dom` `^19.3.0`. `apps/web/astro.config.ts` sets `site: "https://effect.website"`, `trailingSlash: "never"`, `compressHTML: true`, `build.concurrency: 1` (required for `experimental.incrementalBuild: true`), and `experimental.svgOptimizer: svgoOptimizer()`.
- **React islands and client hydration.** Interactive pages mount React islands with Astro client directives. `apps/web/src/pages/play.astro` opts out of prerendering (`export const prerender = false`), sets `Cross-Origin-Embedder-Policy: require-corp` and `Cross-Origin-Opener-Policy: same-origin` headers (needed for WebContainer's `SharedArrayBuffer`), and mounts `<CodeEditor client:only="react">` with a static `<PlaygroundLoaderShell slot="fallback" />`. `apps/web/astro.config.ts` lists `src/features/playground/index.tsx` under `vite.optimizeDeps.entries` and deduplicates `["react", "react-dom"]`.
- **Bundler and task runner.** `pnpm-workspace.yaml` aliases `vite` to `npm:@voidzero-dev/vite-plus-core@1.0.0` (with `vite-plus: 1.0.0` and `overrides.vite: "catalog:"`), which bundles via Rolldown (`vite.build.rolldownOptions` in `apps/web/astro.config.ts`). Root `vite.config.ts` configures `vite-plus` (`vp`) for formatting, type-aware linting (`oxlint`, enforcing `vite-plus/prefer-vite-plus-imports`), Vitest projects (`vp test`), and cached tasks (`vp run dev:web`, `vp run build`, `vp run check`).
- **Package manager and TypeScript.** Root `package.json` pins `pnpm@12.16.1`. `pnpm-workspace.yaml` uses `catalogMode: manual` with `typescript: 6.0.3` and an `allowBuilds` allowlist. `apps/web/tsconfig.json` uses `module: "ESNext"`, `moduleResolution: "Bundler"`, `jsx: "react-jsx"`, `noUncheckedIndexedAccess: true`, and `@/*` -> `./src/*`.

## Hosting target and server vs. static split

- **Alchemy + Cloudflare Workers.** `alchemy.run.ts` deploys `apps/web` through `Cloudflare.Website.Astro("WebsiteWorker", ...)` using `alchemy`, `@alchemy.run/cloudflare`, and `@alchemy.run/frontend-frameworks` at `2.0.0-beta.85` (with `patches/@alchemy.run__frontend-frameworks@2.0.0-beta.85.patch` adding `"astroImageService"` to `NODE_ENVIRONMENTS`).
- **Static by default, Worker on opt-out.** `alchemy.run.ts` sets `astro: { output: "static" }` and `prerenderEnvironment: "node"`. Docs, blog, and API reference pages prerender at build time and serve from Cloudflare static assets (`assets.htmlHandling: "drop-trailing-slash"`).
- **Worker-handled routes.** Routes with `export const prerender = false` execute on the Cloudflare Worker:
  - `apps/web/src/pages/play.astro` (sets COOP/COEP headers per response).
  - `apps/web/src/pages/api/dprint/plugins/[plugin].ts` (proxies dprint WASM plugins via Effect `HttpRouter.toWebHandler`).
  - `apps/web/src/lib/ingest-proxy.ts` (injected at `/_ingest/[...path]` in `apps/web/astro.config.ts`, routed ahead of static assets via `assets.runWorkerFirst: ["/_ingest/*"]`).
  - Worker bindings include D1 (`DB`), Cloudflare RateLimit (`MOTW_VOTE_LIMIT`), Turnstile keys, Mixedbread search env vars, and Upstash Redis (`KV_REST_API_URL`, `KV_REST_API_TOKEN`). `sessionKVBindingName` is `false`.
- **Dev server differences.** `astro dev` has no `cloudflare:workers` module; `apps/web/src/features/motw-vote/dev-fallback-plugin.ts` stubs it with `export const env = {}` during `serve`. In dev, `apps/web/astro.config.ts` proxies `/api/dprint/plugins` to `https://plugins.dprint.dev`.
- **Constraint on LSP hosting.** Cloudflare Workers cannot spawn Node child processes (`tsserver` or a stdio LSP server), and docs pages are static assets without COOP/COEP headers. An LSP for docs or the playground must run in the browser (Web Worker or WebContainer) or talk to an external non-Worker service.

## Installed Effect packages and import paths

`pnpm-workspace.yaml` (`catalogs.effect` and `minimumReleaseAgeExclude`) and `apps/web/package.json` pin **Effect 4.1.2** (not 4.1.5):

- `effect`: `4.1.2`
- `@effect/atom-react`: `4.1.2`
- `@effect/platform-browser`: `4.1.2`
- `@effect/platform-node`: `4.1.2`
- `@effect/monaco-editor`: `^0.0.3` (`0.0.3` in `minimumReleaseAgeExclude`)
- `@effect/sql-d1`: `4.1.2`
- `@effect/doctest`: `4.1.2` (root `devDependencies`)

### Verified import paths from repo source

These paths are imported in type-checked files under `apps/web/src/features/playground/`:

- `Atom`: `effect/reactivity/Atom` (`atoms/import.ts`, `atoms/editor.ts`, `atoms/workspace.ts`, `atoms/theme.ts`, `atoms/location.ts`)
- `AtomRegistry`: `effect/reactivity/AtomRegistry` (`services/webcontainer.ts`, `services/devtools.ts`)
- `AsyncResult`: `effect/reactivity/AsyncResult` (`index.tsx`)
- React hooks (`useAtomValue`, `useAtomSet`, `useAtomMount`, `useAtomSuspense`): `@effect/atom-react` (`index.tsx`, `components/file-editor.tsx`, `context/workspace.tsx`)
- `BrowserKeyValueStore`: `@effect/platform-browser/BrowserKeyValueStore` (`atoms/import.ts`)
- Other Effect 4 subpaths in use: `effect/Context` (`Context.Service`), `effect/http/FetchHttpClient`, `effect/http/HttpRouter`, `effect/http-api/HttpApiClient`, `effect/devtools/DevToolsSchema`, `effect/encoding/Ndjson`, `effect/encoding/Base64`.

### Unverified exports (blocked by missing `node_modules` in worktree)

`node_modules/` is not installed in this git worktree, so `node_modules/*/package.json` exports could not be inspected directly. Before importing any of the following modules, verify their exact export paths in `effect@4.1.2`, `@effect/atom-react@4.1.2`, `@effect/platform-browser@4.1.2`, and `@effect/platform-node@4.1.2` against an installed `node_modules`:

- `RpcSerialization`
- `ChildProcess`
- `Socket`
- `BrowserSocket`
- `Worker`
- `BrowserWorker`
- `AtomRpc`
- `ScopedAtom`
- `RegistryContext`

## Existing code samples and Monaco playground

### Docs code blocks

- `apps/web/ec.config.mjs` configures `astro-expressive-code` with themes `["github-light", "github-dark"]`, `useDarkModeMediaQuery: false`, and `themeCssSelector: (theme) => "[data-theme='" + theme.type + "']"`. `apps/web/src/layouts/BaseLayout.astro` keeps `document.documentElement.dataset.theme` in sync with `html.dark` via a `MutationObserver` and `localStorage.getItem("theme")`.
- Active Expressive Code plugins: `pluginCollapsibleSections()`, `pluginLineNumbers()`, and `pluginOpenInPlayground()` (`apps/web/src/plugins/expressive-code/open-in-playground.ts`).
- `pluginOpenInPlayground()` attaches an "Open in the Effect Playground" button to every `ts` code block whose meta includes `twoslash` (unless `playground=false`). Its client script (`apps/web/src/plugins/expressive-code/open-in-playground/js-module.min.ts`) reads `dataset.code` from the copy button, base64url-encodes it, and opens `/play?code=<encoded>&version=<v4|v3>`.
- Markdown processing in `apps/web/astro.config.ts` also runs `remarkMermaid` (`apps/web/src/features/docs/remark-mermaid.ts`) to compile `mermaid` fences into static SVGs. `shiki` (`^4.5.0`) and `@shikijs/core` (`4.5.0`) are installed in `apps/web/package.json`.

### Monaco playground (`apps/web/src/features/playground/`)

- **Editor bundling.** `apps/web/src/features/playground/plugins/monaco-editor.ts` (`monacoEditorPlugin`, registered in `apps/web/astro.config.ts`) excludes `@effect/monaco-editor` from `optimizeDeps`, rewrites `esm/vs/editor/editor.main.js` to load language workers via Vite `?worker` imports and set `self["MonacoEnvironment"].getWorker`, and adds `CORP: cross-origin` + `COEP: require-corp` headers on `?worker_file` requests in dev.
- **Monaco configuration (`services/monaco.ts`).** `@effect/monaco-editor` embeds TypeScript 5.6 (noted at line 12). `Monaco` enables `setEagerModelSync(true)`, sets `strict`, `exactOptionalPropertyTypes`, `module: NodeNext`, `moduleResolution: NodeNext`, `target: ESNext`, defines `chrome-devtools` and `dracula` themes, monkey-patches `registerCompletionItemProvider` for TypeScript to prune Node built-ins and rewrite type auto-imports to `import type`, and registers a `twoslash` `InlayHintsProvider` (`// ^?` and `// =>`) backed by Monaco's TS worker `getQuickInfoAtPosition`. It saves/restores per-URI view state and exposes editor edits as an Effect `Stream<ModelSnapshot>`.
- **Type acquisition (`atoms/workspace.ts`, `services/typescript-project.ts`).** After `@webcontainer/api` boots and runs `workspace.prepare` (`pnpm install -E ...` in `jsh`), `setupWorkspaceTypeAcquisition` recursively walks `/node_modules/.pnpm/<content-address>/node_modules/...` inside WebContainer, reads every `package.json` and `.d.ts` file, and registers them into `monaco.languages.typescript.typescriptDefaults.addExtraLib` through `ExtraLibRegistry` (which diffs and disposes stale entries). Watching `package.json` re-runs acquisition after user installs. `setupWorkspaceFormatters` also watches `dprint.json` and loads dprint WASM plugins through `/api/dprint/plugins/:plugin`.
- **Workspace and file sync (`domain/workspace.ts`, `services/webcontainer.ts`, `services/file-sync.ts`).** `Workspace` is a `Schema.Class` holding an immutable `FileTree` (`File` | `Directory`), `prepare`, `shells`, and derived `effectVersion` (`v3` or `v4`, defaulting to `v4`). `WebContainer` mirrors each workspace file to a Monaco `ITextModel` (keyed by `monaco.Uri.file(fullPath)`), coordinating debounced editor writes (2s debounce in `atoms/editor.ts`) and recursive WebContainer FS watcher reconciliations (100ms debounce) with a `mutationLock` semaphore and per-file `FileSync` state machine.
- **Atom wiring (`@effect/atom-react` + `effect/reactivity/Atom`).**
  - `index.tsx` reads `importAtom` with `useAtomValue` and renders via `AsyncResult.builder(result)`.
  - `importAtom` (`atoms/import.ts`) resolves the initial workspace in order: session version override, URL `#hash` (`ShortenClient` + `WorkspaceCompression` deflate-raw/base64), `?code` + `?version` (`Atom.searchParam`), `localStorage` autosave (`Atom.kvs` with `BrowserKeyValueStore.layerLocalStorage`), then default v3/v4 workspace.
  - `WorkspaceProvider` (`context/workspace.tsx`) suspends on `workspaceHandleAtom(workspace)` (`Atom.family` on `Atom.runtime`), mounts `autoSaveAtom(handle)` via `useAtomMount`, and provides the handle via React `WorkspaceContext`.
  - `FileEditor` (`components/file-editor.tsx`) gets `editorAtom(handle)` (`Atom.family` with `Atom.setIdleTTL("10 seconds")`), mounts `atom.editor` via `useAtomMount`, and passes the container element via `useAtomSet(atom.element)` in a ref callback.
  - `themeAtom` (`atoms/theme.ts`) observes `document.documentElement`'s `class` attribute via `MutationObserver` with `get.addFinalizer`.
