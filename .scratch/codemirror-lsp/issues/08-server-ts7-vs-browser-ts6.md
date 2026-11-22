# Choose primary architecture: server-hosted TS 7 vs browser-only TS 6

Type: grilling
Status: open
Blocked by: 02, 03, 04, 05, 07

## Question

Should the primary LSP backend be server-hosted TypeScript 7 (`tsc --lsp --stdio` over WebSockets) or browser-only TypeScript 6 in a Web Worker (vtsls or `@typescript/vfs`)?

Weigh the findings from hosting feasibility (02), the TS 7 stdio probe (03), `@effect/tsgo` / `@effect/language-service` support (04), `.d.ts` delivery (05), and v1 use cases (07):
1. Pick the primary route for v1.
2. Decide whether the alternate route is out of scope or kept as a secondary `Transport` layer.
3. Confirm whether the working hypothesis (keeping `@codemirror/lsp-client` behind an Effect `Transport` service) still holds under the chosen route.
