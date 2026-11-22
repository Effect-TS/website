# CodeMirror 6 + TypeScript LSP editor

## Destination

A settled technical spec and implementation ticket breakdown for a separate, lightweight, fast-loading CodeMirror 6 editor on the Effect website with TypeScript LSP support (completions, hover, signature help, diagnostics, go to definition, rename). Effect manages transport, server lifecycle, concurrency, and errors; Effect Atom connects editor and language server state to React.

## Notes

- **Tracker:** Local Markdown under `.scratch/codemirror-lsp/` (`docs/agents/issue-tracker.md`).
- **Skills to consult:** `grilling` and `domain-modeling` for grilling tickets; `research` for research tickets; `prototype` for prototype tickets; `unslop-text` for all writing.
- **Working hypothesis (open to challenge):** Keep `@codemirror/lsp-client` as the LSP client. Wrap its `Transport` in an Effect `Context.Service` with one layer per backend route, plus scoped lifecycle and reconnection. Do not build a custom LSP client on Effect RPC unless research shows `@codemirror/lsp-client` blocks a required capability.
- **Constraints:**
  - Use Effect for transport, lifecycle, concurrency, and errors. No ad hoc promise plumbing around sockets or workers.
  - Route React UI state through Effect Atom unless research finds a concrete reason it cannot.
  - Keep this editor separate from the existing Monaco playground (`apps/web/src/features/playground`) for now, optimized for faster load time and smaller footprint. Replacing Monaco is a later decision if this experiment succeeds.
- **Prior investigation facts (from effect 4.1.5, confirm against this repo):**
  - `@codemirror/lsp-client` (6.2.2) handles initialize, document sync, completion, hover, signature help, diagnostics, rename, formatting, definition, and references.
  - Its `Transport` interface takes bare JSON strings (no `Content-Length` headers): `{ send(msg: string): void; subscribe(h: (v: string) => void): void; unsubscribe(h: (v: string) => void): void }`.
  - It does not advertise code actions, inlay hints, or semantic tokens, but exposes `client.request(method, params)`.
  - Default request timeout is 3000 ms. Default `Workspace` allows one `EditorView` per file; multi-file UIs need a custom `Workspace` subclass.
  - TypeScript 7 ships an LSP server (`tsc --lsp --stdio`), unverified by hand; reported gaps are refactor code actions and the tsserver plugin API.
  - Browser-only route uses `typescript@6` in a Web Worker via vtsls or `@typescript/vfs` (reference demo: `https://github.com/andy0130tw/codemirror-lsp-client-demo`). Val Town moved from `codemirror-ts` to LSP over WebSocket (`https://github.com/val-town/vtlsp`).
  - Expected Effect modules: `RpcSerialization.jsonRpc({ controlMessages: false })`, `ChildProcess`/`ChildProcessSpawner`/`Stdio`, `Socket`/`BrowserSocket`/`NodeSocketServer`, `Worker`/`WorkerRunner`/`BrowserWorker`/`RpcClient.layerProtocolWorker`, `McpClient`/`McpServer` (reference pattern), `Atom`/`AtomRegistry`/`AsyncResult`/`AtomRpc` and `@effect/atom-react`. Known gaps: no LSP `Content-Length` framing codec, and Effect RPC interruption differs from LSP `$/cancelRequest`.

## Decisions so far

<!-- One line per resolved ticket: - [<ticket title>](issues/NN-<slug>.md): <one-line gist> -->

- [Survey repo architecture, existing playground, and Effect setup](issues/01-repo-survey.md): `apps/web` is Astro 7 static + Cloudflare Workers (Alchemy) on `vite-plus`/Rolldown and Effect `4.1.2` (`effect/reactivity/Atom`, `AtomRegistry`, `AsyncResult`, `@effect/atom-react`); `/play` uses COOP/COEP + WebContainer + `@effect/monaco-editor` (TS 5.6) while docs are static `astro-expressive-code`, so unreferenced Effect `4.1.2` exports still need verification once `node_modules` is installed.
- [Evaluate hosting feasibility for long-lived LSP backend](issues/02-hosting-backend-feasibility.md): Cloudflare Workers alone cannot run native `tsgo --lsp --stdio` (no OS processes, 128 MB isolate cap); if a server-hosted native LSP is needed, Cloudflare Containers via `@alchemy.run/cloudflare` (`basic` 1 GiB, 1-3 s cold start, scale-to-zero) is the best in-stack fit, with a warm Fly.io Machine ($6.70/mo for 1 GB) as the main external fallback.
- [Verify tsc --lsp --stdio command, framing, and hover round trip](issues/03-tsc-lsp-stdio-probe.md): Verified `@typescript/native-preview` `7.0.0-dev.20260707.2` via `tsgo --lsp --stdio` (standard `Content-Length` framing, 2.3 ms server hover); `tsgo` sends a blocking `client/registerCapability` request during `initialized` that clients must answer, rejects `params: null` on `shutdown`/`exit`, and omits `refactor` code actions and tsserver plugins.
- [Check whether @effect/tsgo serves LSP diagnostics](issues/04-effect-tsgo-lsp.md): `@effect/tsgo` serves full Effect `TS377xxx` diagnostics, quickinfo, completions, refactors, and inlay hints over `--lsp --stdio` as a native Go binary (server-side TS 7 route only); on the browser TS 6 route, `vtsls` is Node-only without shims, so Effect diagnostics require `@typescript/vfs` + `@effect/language-service` with a synthetic `PluginCreateInfo` after auditing its `dist/` bundle for Node built-ins.
- [Investigate type definition delivery for effect and other packages](issues/05-type-definitions-delivery.md): Browser workers should load build-time static `.d.ts` packs (`ts-libs` + `effect@4.1.2` core, per-package add-ons cached in Cache API/IndexedDB) rather than Monaco's WebContainer `pnpm install`; server LSPs should share a hoisted, read-only parent `node_modules` per Effect major version without per-session copies or symlinks.
- [Research Effect Atom patterns for CodeMirror and LSP state](issues/06-effect-atom-editor-link.md): Use `Atom.runtime` (short `setIdleTTL`) inside a per-instance `<RegistryProvider>` + `ScopedAtom.make` to own transport/LSP/`EditorView` scopes, keep live document text in CodeMirror `EditorState` with one-way `Annotation`-tagged dispatches and debounced streams, derive per-file `Atom.family` selectors from canonical workspace maps, use `runtime.fn` + `AsyncResult` (not `AtomRpc`) for extra LSP requests, and mount behind Astro's `client:only="react"` island boundary.
- [Prototype bare CodeMirror 6 with @codemirror/lsp-client and vtsls worker](issues/10-proto-bare-codemirror-vtsls.md): Works in `apps/web` (`prototype/cm-lsp-vtsls`, `844de07b`) with push diagnostics, hover (42 ms), and completions (127 ms) out of the box in `@codemirror/lsp-client@6.3.1`, and the CM6 + LSP shell is only 183.7 KB gzip (7.6x smaller than Monaco's main bundle), but browser `vtsls` adds 5.05 MB gzip total (~2x Monaco's static bundle) and requires Vite WASM inlining, undeclared `uuid`, and COEP headers on static worker assets.
- [Decide editor use cases, lightweight target, and multi-file scope](issues/07-editor-use-cases-and-scope.md): v1 ships as an unlisted standalone single-file **Scratchpad** at `/scratchpad` with one preloaded Effect snippet, a compact LSP status indicator, no code execution, no hard bundle cap while still tracking bundle size, latency targets under 500 ms editable and under 1.5 s warm first diagnostic/hover, multi-file editing deferred to v2, and four concrete gates required before ever considering a `/play` replacement.
- [Choose primary architecture: server-hosted TS 7 vs browser-only TS 6](issues/08-server-ts7-vs-browser-ts6.md): v1 runs server-hosted `@effect/tsgo --lsp --stdio` on Cloudflare Containers (`@alchemy.run/cloudflare`) behind WebSockets, one scoped child process per connection, with framing and `tsgo` quirks absorbed on the server bridge and `@codemirror/lsp-client` kept behind a backend-agnostic Effect `Transport` service (ADR: `docs/adr/0001-server-hosted-effect-tsgo-lsp.md`).

## Not yet specified

- **Extra LSP extensions:** Implementation approach for code actions, inlay hints, or semantic tokens if selected in [Decide which missing LSP features to build beyond @codemirror/lsp-client](issues/09-missing-lsp-features.md).
- **Fake LSP server test harness:** Scripted server for deterministic integration tests of transport, reconnection, and atom state.
- **Final spec and implementation tickets:** Written once the remaining grilling and prototype tickets clear the fog.

## Out of scope

- **Replacing the existing Monaco playground (`apps/web/src/features/playground`):** This effort designs a separate, lightweight editor experiment. Migrating or retiring Monaco is a follow-up effort if this succeeds.
- **Browser-only TypeScript 6 Web Worker backend (`vtsls` or `@typescript/vfs`):** Ruled out for v1 in [Choose primary architecture: server-hosted TS 7 vs browser-only TS 6](issues/08-server-ts7-vs-browser-ts6.md); the Effect `Transport` service interface stays backend-agnostic if a worker layer is ever added later.
- **Code execution (`@webcontainer/api`, terminal output):** Out of scope except where it touches the editor's file or workspace boundary.
- **Writing a full custom LSP client on Effect RPC:** Ruled out; `@codemirror/lsp-client` remains the LSP client behind an Effect `Transport` service.
- **Multi-file editing and custom CodeMirror `Workspace`:** Deferred to v2; v1 uses `@codemirror/lsp-client`'s built-in `Workspace` with a single file.
- **Inline docs or blog embeds, URL sharing, localStorage persistence, and snippet or package pickers:** Deferred beyond v1; `/scratchpad` ships only one preloaded snippet and a minimal LSP status indicator.
