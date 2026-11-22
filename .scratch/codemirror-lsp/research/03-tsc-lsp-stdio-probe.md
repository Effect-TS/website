# TypeScript 7 (`tsgo --lsp --stdio`) hand probe

Verified on 2026-11-21 against `@typescript/native-preview` version `7.0.0-dev.20260707.2` (`serverInfo: { name: "typescript-go", version: "7.0.0-dev.20260707.2" }`) in an isolated `/tmp` project with `tsconfig.json` and `index.ts`.

## Command and binary

- Package: `@typescript/native-preview`
- Binary: `tsgo` (invoked as `tsgo --lsp --stdio`; `tsc` is not the binary name in `@typescript/native-preview`, even though `tsgo --help` prints `tsc: The TypeScript Compiler - Version 7.0.0-dev.20260707.2`).
- Tested invocation: `npx -y -p @typescript/native-preview tsgo --lsp --stdio`.

## Wire framing and protocol quirks

1. **Standard LSP framing on stdio:** Every message uses `Content-Length: <utf8-byte-length>\r\n\r\n<json>`. `tsgo` emits no logs on `stderr`; diagnostic and timing logs arrive as `window/logMessage` notifications over `stdout`.
2. **Server-to-client request during `initialized` blocks the server:** Immediately after receiving `initialized`, `tsgo` sends a server-to-client request:
   ```json
   {
     "jsonrpc": "2.0",
     "id": "ts1",
     "method": "client/registerCapability",
     "params": {
       "registrations": [
         {
           "id": "typescript-config-watch-id",
           "method": "workspace/didChangeConfiguration",
           "registerOptions": { "section": ["js/ts", "typescript", "javascript", "editor"] }
         }
       ]
     }
   }
   ```
   When our first probe ignored this request, `textDocument/didOpen` and `textDocument/hover` hung until timeout. Replying `{ "jsonrpc": "2.0", "id": "ts1", "result": null }` unblocked `initialized` in under 1 ms. Any bridge or client talking to `tsgo` must handle server-to-client requests (including string IDs like `"ts1"`).
3. **`shutdown` and `exit` reject `"params": null`:** Sending `{ "jsonrpc": "2.0", "id": 3, "method": "shutdown", "params": null }` returns `-32602 InvalidParams: expected no params, got null`. Omit the `params` field on `shutdown` and `exit`.

## Verified hover round trip and timings

Test file (`/tmp/tsgo-lsp-probe-.../index.ts`):
```ts
const greeting: string = "hello";
function add(a: number, b: number) { return a + b; }
const total = add(1, 2);
```

Hover request at `{ line: 2, character: 15 }` (`add`):
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "contents": {
      "kind": "markdown",
      "value": "```typescript\nfunction add(a: number, b: number): number\n```\n"
    },
    "range": {
      "start": { "line": 2, "character": 14 },
      "end": { "line": 2, "character": 17 }
    }
  }
}
```

Measured timings:
- Process spawn (via `npx`) + `initialize` response: **1019.8 ms** (most of this is `npx` overhead; direct native binary startup is much faster).
- `initialized` server handling: **0.96 ms**.
- First `textDocument/didOpen` (loading `tsconfig.json` and building initial 64-file program with stdlib): **88.1 ms**.
- `textDocument/hover` end-to-end (queued behind `didOpen`): **92.3 ms**; server-side hover handler time: **2.30 ms**.

## Advertised server capabilities and gaps

From the `initialize` response (`Content-Length: 1770`):

- **Supported out of the box:**
  - `positionEncoding: "utf-16"`
  - `textDocumentSync`: `openClose: true`, incremental `change: 2`, `save: true`
  - `completionProvider` (with `resolveProvider: true`, `labelDetailsSupport: true`)
  - `hoverProvider: true`
  - `signatureHelpProvider`
  - `definitionProvider`, `typeDefinitionProvider`, `implementationProvider`, `referencesProvider`
  - `documentHighlightProvider`, `documentSymbolProvider`, `workspaceSymbolProvider`
  - `renameProvider: { prepareProvider: true }`
  - `documentFormattingProvider`, `documentRangeFormattingProvider`, `documentOnTypeFormattingProvider`
  - `foldingRangeProvider`, `selectionRangeProvider`, `callHierarchyProvider`, `linkedEditingRangeProvider`, `codeLensProvider`
  - `inlayHintProvider: true`
  - `semanticTokensProvider: { legend: { tokenTypes: [], tokenModifiers: [] }, range: true, full: true }` (legend is populated when client advertises semantic token capabilities)
  - `diagnosticProvider: { identifier: "typescript", interFileDependencies: true, workspaceDiagnostics: false }` (pull diagnostics; also emits `textDocument/publishDiagnostics`)
- **Confirmed gaps:**
  - `codeActionProvider.codeActionKinds` lists only `["quickfix", "source.organizeImports", "source.removeUnusedImports", "source.sortImports", "source.fixAll"]`. **No `refactor` code actions** are advertised.
  - No tsserver plugin API is exposed (consistent with the prior investigation).
