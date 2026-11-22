# Effect diagnostics over LSP: `@effect/tsgo` vs `@effect/language-service`

## Summary

Effect's custom diagnostics can appear in the CodeMirror LSP editor on the server-side TS 7 route with no custom plugin plumbing, because `@effect/tsgo` compiles the Effect language service directly into a native Go `tsgo` binary and serves standard LSP over `--lsp --stdio`. On the browser-only TS 6 Web Worker route, `vtsls` is out because it targets Node only. Running `@effect/language-service` inside a `@typescript/vfs` Web Worker requires manually invoking its `tsserver` plugin factory with a mock `PluginCreateInfo`, and that still needs a local bundle audit to confirm whether `@effect/language-service@0.87.3` pulls in Node built-ins.

## 1. What `@effect/tsgo` is and what it serves over LSP

`@effect/tsgo` (`https://github.com/Effect-TS/tsgo`) is Effect's official successor to `@effect/language-service`. It embeds a pinned build of Microsoft's Go-based TypeScript 7 compiler (`tsgo`), applies a custom patch stack (`patches/`), and implements the Effect diagnostics and editor features directly in Go under `internal/`:

- `internal/rules/` and `internal/rulerunner/diagnostics.go` for diagnostic rules
- `internal/pluginoptions/resolver.go` for reading plugin configuration
- `internal/quickinfo/` for Effect-aware hover tooltips
- `internal/completions/` for Effect completions and snippets
- `internal/refactors/` for quick fixes and refactors
- `internal/inlayhints/` for Effect type, error, and requirement inlay hints

### Packaging and runtime target

`@effect/tsgo` ships on npm as a CLI wrapper plus platform-specific native binary subpackages via `optionalDependencies`, such as `@effect/tsgo-linux-arm64` and `@effect/tsgo-win32-x64`. It does not ship a WebAssembly or browser build. Running `@effect/tsgo` requires a host that can execute native Go binaries, such as a Node server or container, not a browser Web Worker or Cloudflare Worker isolate.

### LSP invocation and configuration

`@effect/tsgo` serves standard JSON-RPC LSP over stdio with `--lsp --stdio`:

- Direct binary invocation: `./node_modules/.bin/tsgo --lsp --stdio`
- Wrapper CLI invocation: `effect-tsgo tsc@7.0.2 --lsp --stdio`

It reads its Effect plugin configuration from `tsconfig.json` under `compilerOptions.plugins` using the same `"name": "@effect/language-service"` entry that the legacy plugin uses:

```json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "@effect/language-service",
        "diagnostics": true,
        "quickinfo": true,
        "refactors": true,
        "diagnosticSeverity": {
          "floatingEffect": "warning"
        }
      }
    ]
  }
}
```

### Diagnostics and LSP features exposed

`@effect/tsgo` emits Effect-specific diagnostics with `TS377xxx` codes, grouped into five categories: `correctness`, `antipattern`, `effect-native`, `style`, and `maintainers`. These are the same rules exposed to Oxlint under the `effecttsgo/*` namespace. Examples verified from `Effect-TS/tsgo`:

- **Service and requirement checks.** `missingEffectContext` flags unhandled `R` requirements when running or using an Effect. `leakingRequirements` (`TS377041`) flags requirements leaking out of a scope or function.
- **Error channel checks.** `missingEffectError` (`TS377003`, fixable) catches missing or unhandled error types. `anyUnknownInErrorContext` flags `any` or `unknown` in error or context channels.
- **Yield and generator checks.** `floatingEffect` (`TS377001` / `TS377058`) catches created Effects that are neither yielded, returned, nor assigned. `missingReturnYieldStar` flags plain `return` where `return yield*` is needed in `Effect.gen`. `unnecessaryEffectGen` (`TS377017`) flags single-return `Effect.gen` blocks.
- **Structural and package checks.** `classSelfMismatch`, `duplicatePackage`, and `effectFnImplicitAny`.

Over LSP, `@effect/tsgo` exposes diagnostics, hover (`quickinfo`), completions, refactors/quick fixes, and inlay hints alongside standard TypeScript 7 LSP features.

## 2. Can `@effect/language-service` run in a browser Web Worker?

### Current state in this repository

- Root `package.json` declares `"@effect/language-service": "^0.87.3"` in `devDependencies` and runs `"prepare": "vp config && effect-language-service patch"`.
- `tsconfig.base.json` enables `"@effect/language-service"` in `compilerOptions.plugins` for repo typechecking.
- `apps/web/package.json` does **not** depend on `@effect/language-service`. The existing Monaco playground uses `@effect/monaco-editor` at `^0.0.3`, Effect's fork of Monaco Editor.
- `node_modules` is not installed in this git worktree, so `node_modules/@effect/language-service` could not be inspected on disk during this pass.

### `vtsls` cannot run in a browser Web Worker

`@vtsls/language-server` wraps VS Code's TypeScript extension, which spawns `tsserver.js` via Node's `child_process` and uses `fs` and stdio streams. The `vtsls` README states explicitly: "Running in browser, the server only targets on Node environment." If the editor runs client-side in a Web Worker, `vtsls` is not an option without a Node-compatible VFS shim.

### `@typescript/vfs` + `@effect/language-service` in a Web Worker

Plain `ts.createLanguageService(host)` inside `@typescript/vfs` does not load `compilerOptions.plugins`. Only `tsserver` in Node reads `compilerOptions.plugins` and loads them with `require()`.

To run `@effect/language-service` inside a browser Web Worker on TS 6, you have to wire it manually:

1. Import the plugin factory directly in the worker bundle.
2. Call `init({ typescript: ts })` and then `plugin.create(info)` with a synthetic `ts.server.PluginCreateInfo` wrapping the VFS `ts.LanguageService`, `ts.LanguageServiceHost`, and plugin config object.
3. Wrap the returned `ts.LanguageService` proxy in a JSON-RPC LSP adapter so `@codemirror/lsp-client` can talk to it.

There are three catches with this path:

- **Unverified Node built-in imports.** `@effect/language-service` targets `typescript/lib/tsserverlibrary` in Node and ships a Node CLI (`effect-language-service patch`). Because `node_modules` is absent in this worktree, we have not audited the compiled `dist/` entry point of `@effect/language-service@0.87.3` for `node:fs`, `node:path`, or `process` usage. Any Node import in the plugin entry point, or disk checks in rules like `duplicatePackage`, will break Web Worker bundling unless shimmed or disabled.
- **Synthetic `PluginCreateInfo` fragility.** Plugins written for `tsserver` can reach into `info.project` or `info.project.projectService` methods that `@typescript/vfs` does not provide. You own maintaining that mock object across updates.
- **Maintenance direction.** Effect has moved active language-service work to `@effect/tsgo`. Investing in a custom browser shim around `@effect/language-service` bets on the legacy TS 5/6 plugin.

One useful consolation: even without `@effect/language-service`, plain `typescript@6` in a Web Worker still reports standard TypeScript assignability errors for Effect types, including unhandled service requirements when calling `Effect.runPromise`. What is missing without the plugin are Effect's custom `TS377xxx` diagnostics, Effect quickinfo formatting, and Effect refactors.

## 3. What each route requires to show Effect diagnostics

### Route A: Server-side `@effect/tsgo` (TS 7)

1. **Native process host.** Run `@effect/tsgo` (`tsgo --lsp --stdio` or `effect-tsgo tsc@7.0.2 --lsp --stdio`) in a Node service or container that supports native Linux binaries, bridged to the browser over WebSockets.
2. **`Content-Length` framing.** Implement an LSP `Content-Length` framing codec between the stdio child process and the WebSocket, since `@codemirror/lsp-client`'s `Transport` expects bare JSON-RPC strings.
3. **Workspace setup.** Provide a `tsconfig.json` with `"plugins": [{ "name": "@effect/language-service", "diagnostics": true }]` and the Effect `.d.ts` files in the server workspace.
4. **Client capability extensions.** Diagnostics, hover (`quickinfo`), completions, go-to-definition, and rename work directly with `@codemirror/lsp-client`. Showing Effect quick fixes, refactors, or inlay hints requires custom `client.request("textDocument/codeAction", ...)` and `client.request("textDocument/inlayHint", ...)` extensions on top of `@codemirror/lsp-client`.

### Route B: Browser Web Worker with TS 6 (`@typescript/vfs` + `@effect/language-service`)

1. **Audit `node_modules/@effect/language-service` first.** After `pnpm install`, inspect the package entry point and `dist/` output for any `node:*` imports or `ts.server.Project` assumptions before committing to this route.
2. **Build a thin worker LSP adapter.** Wrap `@typescript/vfs` and `ts.createLanguageService` in a Web Worker that translates LSP JSON-RPC messages (`textDocument/didOpen`, `didChange`, `completion`, `hover`, `publishDiagnostics`, etc.) into `ts.LanguageService` calls.
3. **Wrap the language service with the plugin.** Pass `{ typescript: ts }` and a synthetic `PluginCreateInfo` to `@effect/language-service`, disable disk-dependent rules like `duplicatePackage` in the plugin config, and shim any remaining `node:path` calls in the worker bundler if the audit finds them.
4. **Fallback if the audit fails.** Drop the plugin and run plain `typescript@6` in the worker, accepting standard TypeScript type errors without Effect's custom `TS377xxx` diagnostics.

## Sources

- `Effect-TS/tsgo` repository (`https://github.com/Effect-TS/tsgo`): Go-based TypeScript 7 build with embedded Effect language service (`internal/rules/`, `internal/rulerunner/diagnostics.go`, `internal/pluginoptions/resolver.go`, `internal/quickinfo/`, `internal/completions/`, `internal/refactors/`, `internal/inlayhints/`, `--lsp --stdio`, `TS377xxx` diagnostic codes and presets).
- `Effect-TS/language-service` repository (`https://github.com/Effect-TS/language-service`): legacy TypeScript language service plugin (`@effect/language-service`), `typescript/lib/tsserverlibrary` dependency, `tsconfig.json` plugin config, and `effect-language-service patch`.
- `yioneko/vtsls` repository (`https://github.com/yioneko/vtsls`): explicit Node-only target ("Running in browser, the server only targets on Node environment") due to `tsserver` and `child_process`.
- Local repository files: `package.json`, `tsconfig.base.json`, `apps/web/package.json`, `pnpm-workspace.yaml`.
