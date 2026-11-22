# Check whether @effect/tsgo serves LSP diagnostics

Type: research
Status: resolved

## Question

Can Effect's own compiler diagnostics (service requirements, yield errors, etc.) appear in the CodeMirror LSP editor, either through `@effect/tsgo` on the TS 7 path or through `@effect/language-service` on the TS 6 browser worker path?

Investigate and document:
1. What `@effect/tsgo` is today, whether it ships or wraps an LSP server (`--lsp --stdio`), and what diagnostics/features it exposes over LSP.
2. Whether `@effect/language-service` (already installed at `^0.87.3` in this repo's root `package.json`) can run inside a browser Web Worker (vtsls or `@typescript/vfs` + TS language service plugin) or whether it depends on Node APIs.
3. What is required to surface Effect diagnostics on each route (TS 7 server vs TS 6 browser worker).

## Answer

Yes, on the server-side TS 7 route. `@effect/tsgo` (`Effect-TS/tsgo`) compiles the Effect language service directly into a patched native Go `tsgo` binary and serves standard JSON-RPC LSP over `--lsp --stdio` (`tsgo --lsp --stdio` or `effect-tsgo tsc@7.0.2 --lsp --stdio`), exposing Effect `TS377xxx` diagnostics (`floatingEffect`, `missingEffectContext`, `missingEffectError`, `missingReturnYieldStar`, `leakingRequirements`, `unnecessaryEffectGen`, etc.), quickinfo hover, completions, refactors, and inlay hints. It ships platform-specific native binaries with no browser or WASM build.

On the browser-only TS 6 Web Worker route, `vtsls` cannot run natively because it targets Node only (`child_process` + `tsserver`). Showing Effect diagnostics in a browser worker requires `@typescript/vfs` + `ts.createLanguageService`, manually invoking `@effect/language-service` with a synthetic `ts.server.PluginCreateInfo` and wrapping it in an LSP adapter. `node_modules` is not installed in this worktree, so `@effect/language-service@0.87.3` still needs a local bundle audit for Node built-in imports before committing to that route. Plain `typescript@6` in a Web Worker still reports standard TypeScript assignability errors for Effect types without any plugin.

Full findings: [04-effect-tsgo-lsp.md](../research/04-effect-tsgo-lsp.md).
