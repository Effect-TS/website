# Survey repo architecture, existing playground, and Effect setup

Type: research
Status: resolved

## Question

What are the concrete facts of this repository that constrain the CodeMirror 6 + TypeScript LSP editor?

Investigate and document:
1. **Framework, rendering, and client JS:** Astro version and config, how React islands hydrate and ship client-side JavaScript, Vite/bundler setup, and package manager (`pnpm` / `vite-plus`).
2. **Hosting target:** How `alchemy.run.ts` and Cloudflare Workers deploy `apps/web`, what runs on the server vs. static assets.
3. **Installed Effect packages and real import paths:** Confirm the exact installed versions of `effect`, `@effect/atom-react`, `@effect/platform-browser`, `@effect/platform-node`, and verify which of the expected modules from the prior effect 4.1.5 investigation (`RpcSerialization`, `ChildProcess`, `Socket`, `BrowserSocket`, `Worker`, `BrowserWorker`, `Atom`, `AtomRegistry`, `AsyncResult`, `AtomRpc`, `ScopedAtom`, `RegistryContext`) exist and what their exact import paths are in this repo.
4. **Existing code samples and Monaco playground:** How docs code blocks currently render (`astro-expressive-code`, Shiki, etc.) and how `apps/web/src/features/playground` currently builds its editor (`@effect/monaco-editor`), loads TypeScript types, manages files, and wires `@effect/atom-react`.

## Answer

`apps/web` is an Astro 7 (`output: "static"`) + React 19 site built with `vite-plus` (Rolldown) and `pnpm@12.16.1`, deployed to Cloudflare Workers via `alchemy.run.ts`. Docs pages are static HTML with `astro-expressive-code` (`github-light`/`github-dark`, `data-theme` selector, and an "Open in Playground" button on `ts twoslash` fences), while `/play` is a Worker-rendered route (`prerender = false`) that sets COOP/COEP headers and hydrates a `<CodeEditor client:only="react">` island.

The repo pins Effect `4.1.2` (`effect`, `@effect/atom-react`, `@effect/platform-browser`, `@effect/platform-node`) in `pnpm-workspace.yaml`. Source files confirm `effect/reactivity/Atom`, `effect/reactivity/AtomRegistry`, `effect/reactivity/AsyncResult`, `@effect/atom-react` hooks, and `@effect/platform-browser/BrowserKeyValueStore`. Because `node_modules` is absent in this worktree, `RpcSerialization`, `ChildProcess`, `Socket`, `BrowserSocket`, `Worker`, `BrowserWorker`, `AtomRpc`, `ScopedAtom`, and `RegistryContext` still need a direct check against installed `node_modules/*/package.json` before use.

The existing playground (`apps/web/src/features/playground/`) bundles `@effect/monaco-editor` (embedded TS 5.6) via a custom Vite plugin, runs `pnpm install` inside `@webcontainer/api`, walks `.pnpm` to feed `.d.ts`/`package.json` into `typescriptDefaults.addExtraLib`, and synchronizes WebContainer files with Monaco models via `FileSync` and Effect `Atom` families.

Full findings: [01-repo-survey.md](../research/01-repo-survey.md).
