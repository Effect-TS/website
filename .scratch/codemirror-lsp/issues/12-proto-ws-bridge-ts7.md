# Prototype WebSocket bridge to @effect/tsgo --lsp --stdio

Type: prototype
Status: open
Blocked by: 02, 03, 04, 08

## Question

Build a throwaway WebSocket bridge to `@effect/tsgo --lsp --stdio` with one scoped Effect `ChildProcess` per connection against a shared read-only `node_modules` directory.

Validate `Content-Length` framing, server-side absorption of `tsgo` protocol quirks (answering `client/registerCapability` during `initialized` and stripping `params: null` on `shutdown`/`exit`), startup latency, hover/completion and Effect `TS377xxx` diagnostic round trips, and clean process teardown when a WebSocket disconnects.
