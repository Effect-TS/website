# Decide which missing LSP features to build beyond @codemirror/lsp-client

Type: grilling
Status: open
Blocked by: 03, 04, 07

## Question

`@codemirror/lsp-client` does not advertise code actions, inlay hints, or semantic tokens by default, though it exposes `client.request(method, params)`.

Using the findings from the TS 7 probe (03), Effect language service / `@effect/tsgo` research (04), and v1 use cases (07), decide:
1. Which of code actions, inlay hints, and semantic tokens are worth building for v1.
2. Whether Effect-specific diagnostics (service requirements, yield errors, etc.) are a v1 requirement or a follow-up.
3. Whether any chosen feature forces changes to the `@codemirror/lsp-client` wrapper or transport layer.
