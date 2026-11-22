# Decide which missing LSP features to build beyond @codemirror/lsp-client

Type: grilling
Status: resolved
Blocked by: 03, 04, 07

## Question

`@codemirror/lsp-client` does not advertise code actions, inlay hints, or semantic tokens by default, though it exposes `client.request(method, params)`.

Using the findings from the TS 7 probe (03), Effect language service / `@effect/tsgo` research (04), and v1 use cases (07), decide:

1. Which of code actions, inlay hints, and semantic tokens are worth building for v1.
2. Whether Effect-specific diagnostics (service requirements, yield errors, etc.) are a v1 requirement or a follow-up.
3. Whether any chosen feature forces changes to the `@codemirror/lsp-client` wrapper or transport layer.

## Answer

1. **Missing LSP features deferred beyond v1.** Do not build code actions (`textDocument/codeAction`), inlay hints (`textDocument/inlayHint`), or semantic tokens (`textDocument/semanticTokens`) for v1. The v1 Scratchpad ships only `@codemirror/lsp-client`'s built-in feature set (completions, hover, signature help, diagnostics, go-to-definition, and rename) alongside CodeMirror's instant Lezer TypeScript syntax highlighting.
2. **Effect-specific diagnostics and quickinfo required in v1.** Effect `TS377xxx` diagnostics and Effect quickinfo from `@effect/tsgo` are a hard v1 requirement, not a follow-up. The container's `tsconfig.json` enables `@effect/language-service` with its default diagnostic and quickinfo rules, with exact `tsconfig.json` defaults settled in [Design server-side @effect/tsgo WebSocket bridge and container lifecycle](13-design-server-tsgo-bridge.md).
3. **No client wrapper or transport changes needed.** Because all three extra LSP features are deferred, `@codemirror/lsp-client` stays stock behind the Effect `Transport` service with no extra `clientCapabilities`, no custom `client.request` extensions, and no `runtime.fn` + `AsyncResult` wrappers for extra LSP features in v1. All protocol adaptation for Effect diagnostics stays on the server bridge via the pull-to-push synthesis verified in [Prototype WebSocket bridge to @effect/tsgo --lsp --stdio](12-proto-ws-bridge-ts7.md).
