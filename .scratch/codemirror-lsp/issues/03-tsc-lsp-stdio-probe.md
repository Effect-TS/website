# Verify tsc --lsp --stdio command, framing, and hover round trip

Type: research
Status: resolved

## Question

Does TypeScript 7's native LSP server work as reported (`tsc --lsp --stdio` or `tsgo --lsp --stdio`)?

Run it by hand against a temporary TypeScript project and document:
1. How to obtain/invoke the TypeScript 7 native binary (e.g. `@typescript/native-preview` / `tsgo` / `tsc`) and the exact CLI flags for stdio LSP mode.
2. Wire framing (`Content-Length` headers, line endings, stderr logging) and `initialize` response capabilities.
3. A verified `initialize` -> `textDocument/didOpen` -> `textDocument/hover` round trip against a temp project, recording the actual request/response payloads and startup/response latency.
4. Confirmed gaps in the advertised capabilities (such as code actions, refactorings, inlay hints, semantic tokens, or plugin support).

## Answer

Verified by hand against `@typescript/native-preview` `7.0.0-dev.20260707.2`.

- **Command:** `tsgo --lsp --stdio` (binary is `tsgo`, not `tsc`). Standard `Content-Length` `\r\n\r\n` framing over stdio; logs go over `window/logMessage`, not `stderr`.
- **Hover round trip:** Succeeded against a temp project (`function add(a: number, b: number): number` in 2.3 ms server time, 88 ms initial `didOpen` project load).
- **Protocol quirks to handle:** `tsgo` sends a blocking `client/registerCapability` request (string id `"ts1"`) during `initialized` that must be answered before it processes `didOpen`/`hover`. `shutdown` and `exit` must omit `params` (`params: null` returns `-32602`).
- **Capabilities & gaps:** Advertises completion, hover, signature help, definition, references, rename, formatting, inlay hints, semantic tokens, pull diagnostics, and quickfix/import code actions. Confirms no `refactor` code actions and no tsserver plugin API.

Full probe details: [03-tsc-lsp-stdio-probe.md](../research/03-tsc-lsp-stdio-probe.md).
