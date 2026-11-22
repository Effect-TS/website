# Prototype WebSocket bridge to tsc --lsp --stdio

Type: prototype
Status: open
Blocked by: 02, 03, 08

## Question

If server-hosted TypeScript 7 remains in play after deciding the primary route (08), build a throwaway WebSocket bridge to `tsc --lsp --stdio` with one scoped Effect `ChildProcess` per connection.

Validate Content-Length framing, startup latency, hover/completion round trips, and clean process teardown when a WebSocket disconnects. If ticket 08 rules out server-hosted TS 7, close this ticket as out of scope.
