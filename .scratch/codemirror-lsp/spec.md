# CodeMirror 6 Scratchpad with server-hosted `@effect/tsgo` LSP

Status: ready-for-agent

## Problem Statement

The Effect website has an interactive **Playground** at `/play`, but it loads `@effect/monaco-editor` (2.69 MB gzip static bundle) and boots a WebContainer to install packages before TypeScript diagnostics appear. Visitors who only want to write and type-check a single Effect TypeScript snippet with full Effect diagnostics and quickinfo pay the full startup cost of a multi-file execution environment.

Bundling a TypeScript 6 compiler in a browser Web Worker does not fix this. A prototype using `vtsls` added 5.05 MB gzip to the client payload, took about 3 seconds to show first diagnostics, required Vite WASM inlining and COEP headers on static assets, and lacked Effect `TS377xxx` diagnostics.

## Solution

Ship a standalone, unlisted, single-file **Scratchpad** at `/scratchpad` built on CodeMirror 6 and `@codemirror/lsp-client` (183.7 KB gzip shell) backed by `@effect/tsgo`'s Rust `tsrs --lsp --stdio` server running on Cloudflare Containers over WebSockets.

The editor mounts immediately with Lezer TypeScript syntax highlighting so the visitor can edit in under 500 ms on a warm connection. In the background, an Effect `LspTransport` service opens a WebSocket to `/api/lsp`, connects `@codemirror/lsp-client`, and delivers TypeScript and Effect `TS377xxx` diagnostics, Effect quickinfo, completions, signature help, go-to-definition, and rename in under 1.5 seconds warm. A compact status indicator driven by Effect Atom shows connection state, recovers automatically from transient drops, and lets idle sessions scale containers to zero without waking them from background tabs.

## User Stories

1. As a visitor opening `/scratchpad`, I want the editor to render and accept typing in under 500 ms with TypeScript syntax highlighting, so that I do not wait on a WebSocket or container cold start before editing.
2. As a visitor opening `/scratchpad`, I want a preloaded Effect TypeScript snippet in the editor, so that I see live Effect diagnostics and quickinfo immediately without writing boilerplate.
3. As a visitor writing Effect code, I want Effect `TS377xxx` diagnostics (such as `TS377001` floating effect) alongside standard TypeScript errors inline in the editor, so that I catch Effect-specific mistakes as I type.
4. As a visitor hovering over an Effect expression, I want Effect quickinfo showing type parameters and service requirements, so that I can inspect inferred types without running the code.
5. As a visitor typing in the Scratchpad, I want TypeScript completions, signature help, go-to-definition into `effect` declarations, and symbol rename, so that editing matches a standard TypeScript editor.
6. As a visitor on a cold Cloudflare Container, I want the initial LSP handshake to tolerate a 1 to 3 second startup without timing out, so that the Scratchpad becomes ready without manual reloads.
7. As a visitor looking at the Scratchpad header, I want a compact status indicator showing whether the language server is connecting, ready, reconnecting, idle, or in an error state, so that I know why diagnostics are pending or paused.
8. As a visitor whose WebSocket drops due to a network blip or container restart, I want the Scratchpad to reconnect with backoff and automatically resync my live buffer, so that I keep my unsaved edits and get updated diagnostics.
9. As a visitor whose browser goes offline and comes back online, I want the Scratchpad to retry connecting automatically when connectivity returns, so that I do not have to refresh the page.
10. As a visitor leaving `/scratchpad` open in a background tab for over a minute, I want the server to evict the idle session cleanly and the client to enter an `idle` state without auto-reconnecting, so that idle tabs do not keep containers awake.
11. As a visitor returning to an `idle` Scratchpad, I want typing in the editor, focusing the editor, or clicking the status indicator to wake the LSP session and re-open my current buffer, so that diagnostics resume seamlessly.
12. As a visitor pasting more than 256 KiB of text into the Scratchpad, I want the server to reject the oversized frame and the status indicator to show a clear size-limit error that becomes retryable once I trim the buffer below 256 KiB, so that I know how to recover.
13. As a visitor hitting server capacity limits, I want the status indicator to report a retryable capacity error after backoff attempts exhaust, so that I can click to retry later instead of seeing a stuck spinner.
14. As a site operator deploying on Cloudflare, I want `/api/lsp` to enforce an `Origin` allowlist, per-IP rate limiting, a 4-container pool with 8 sessions per container, and 1-minute scale-to-zero, so that public traffic cannot exhaust container memory or billing.
15. As a developer working locally on `apps/web`, I want to run `packages/lsp-bridge` standalone on localhost and point `astro dev` at it via `PUBLIC_LSP_WS_URL`, so that I can develop and run Playwright tests without Docker.
16. As a developer writing unit tests, I want a controllable in-memory fake `LspTransport` layer and an in-memory fake stdio layer for the server bridge, so that reconnect policy, close-code handling, framing, and debounced diagnostics run deterministically under Effect `TestClock`.
17. As a future maintainer, I want `LspTransport` to remain a plain message-level Effect service decoupled from WebSockets, so that a browser Web Worker transport layer can be added later without changing `@codemirror/lsp-client`, Effect Atom bindings, or React components.

## Implementation Decisions

All decisions below synthesize the accepted ADR (`docs/adr/0001-server-hosted-effect-tsgo-lsp.md`) and resolved Wayfinder tickets (`01` through `15`).

### Scope and placement

- **Standalone unlisted route:** Mount the Scratchpad at `/scratchpad` as an Astro page with a `client:only="react"` island. Keep it unlisted from main site navigation and completely isolated from the existing Playground (`apps/web/src/features/playground/`).
- **Minimal UI:** Show one preloaded Effect TypeScript snippet, the CodeMirror 6 editor, and a compact LSP status indicator. No code execution, no multi-file tabs, no URL sharing, no `localStorage` persistence, and no package or snippet pickers.
- **LSP client choice:** Keep stock `@codemirror/lsp-client` (6.3.x) with its built-in single-file `Workspace` behind an Effect `Context.Service` transport. Do not build a custom LSP client on Effect RPC, and do not add custom `clientCapabilities` or `client.request` extensions for code actions, inlay hints, or semantic tokens.

### Server bridge (`packages/lsp-bridge`)

- **Compiler binary:** Spawn `@effect/tsgo`'s embedded Rust `tsrs` binary (`tsrs --lsp --stdio`) directly alongside its sibling `lib.*.d.ts` files instead of the Go `tsc` binary or Node CLI wrapper. Direct spawning gives `ChildProcess` immediate PID ownership for clean `SIGTERM` teardown on disconnect. Strip unused `tsc`, `oxlint`, and `tsgolint` artifacts from the Docker image. Verify `tsrs` RSS and LSP quirk parity during implementation.
- **Workspace package and concurrency:** Build `@website/lsp-bridge` in `packages/lsp-bridge` using Effect `NodeSocketServer.makeWebSocket` and one scoped `ChildProcess.make` per WebSocket connection. Cap threads with `RAYON_NUM_THREADS=1` (keep `GOMAXPROCS=1` as a fallback if ever switching back to Go `tsgo`). Support running standalone on localhost without Docker for `astro dev` and CI.
- **Framing codec:** Encode and decode LSP `Content-Length` stdio frames over Effect `Stream` using UTF-8 byte lengths (`Buffer.byteLength`), handling split chunks, coalesced frames, and multi-byte UTF-8. Drain child `stderr` to structured server logs so pipe buffers never stall and `SIGTERM` shutdown messages do not produce spurious errors.
- **Protocol quirk absorption:** Keep the browser client free of `tsrs`/`tsgo` workarounds by absorbing them in the bridge:
  - Intercept server-to-client `client/registerCapability` requests and reply `{ result: null }` on stdin without forwarding them to the client.
  - Strip `params: null` from client `shutdown` and `exit` messages before writing to stdin.
  - Forward client-originated `$/cancelRequest` notifications untouched.
- **Pull-to-push diagnostics synthesis:** `@effect/tsgo` only computes diagnostics on pull (`textDocument/diagnostic`), while `@codemirror/lsp-client` only handles push `textDocument/publishDiagnostics`. The bridge synthesizes `textDocument/diagnostic` pulls immediately on `didOpen` and after a 150 ms debounce on `didChange`, cancels any in-flight synthetic pull via `$/cancelRequest` when a newer edit arrives, drops the server's own empty `textDocument/publishDiagnostics` notifications on open/change to prevent flicker, and emits the pull result as `textDocument/publishDiagnostics`. Synthetic requests use a disjoint `"bridge:..."` request ID namespace so they never collide with client IDs or leak to the client.
- **Read-only workspace and `tsconfig.json`:** Bake one static, immutable `/workspace` directory (`0o555`/`0o444`, no per-session temp directories) into the Docker image with hoisted `node_modules` containing `effect` (pinned to the repo's `4.1.x` version) and `tsrs`. Rewrite and restrict editable document URIs to `/workspace/main.ts` while allowing read-only definition targets inside `/workspace`. Configure `/workspace/tsconfig.json` with `strict: true`, `exactOptionalPropertyTypes: true`, `noEmit: true`, `target: "ES2022"`, `module: "ESNext"`, `moduleResolution: "bundler"`, `types: []`, and `plugins: [{ "name": "@effect/language-service" }]`.
- **Limits, close codes, and idle eviction:**
  - Cap incoming WebSocket frames and open document text at 256 KiB (UTF-8 bytes); close violating connections with `1009 Message Too Big`.
  - Close with `1008 Policy Violation` on malformed JSON or disallowed document URIs.
  - Close with `1011 Internal Error` and tear down the Effect scope and child process if `tsrs` crashes or emits invalid stdout framing.
  - Enforce a per-container cap of 8 concurrent `tsrs` sessions; reject overflow with HTTP `503` or WebSocket close `1013 Try Again Later`.
  - Evict idle sessions after 1 minute of inactivity with close code `4000`, resetting the timer only on real LSP frames (not keepalive pings).

### Cloudflare Containers and `WebsiteWorker` gateway

- **Container pool:** Wire `packages/lsp-bridge` into `alchemy.run.ts` via `Cloudflare.Container` on `basic` instances (1 GiB RAM, 1/4 vCPU) using a fixed pool of 4 named `DurableObject` instances (`maxInstances: 4`, selected by client IP hash or round-robin), giving 32 concurrent sessions globally. Set container `sleepAfter` to 1 minute, renewing activity only on real LSP frames.
- **Edge gating:** Expose `/api/lsp` on `WebsiteWorker` (added to `assets.runWorkerFirst`), forwarding WebSocket upgrades to the chosen container `DurableObject` via `getTcpPort(port).fetch(request)`. Gate upgrades with an `Origin` allowlist check and a per-IP `Cloudflare.RateLimit` binding. Skip Turnstile in v1.

### Client transport, reconnection, and Effect Atom bindings

- **Transport service boundary:** Define `LspTransport` as a backend-agnostic Effect `Context.Service` restricted to message transport, keeping it ignorant of LSP `initialize` handshakes so `layerWebSocket` (built on `effect/socket/Socket` and `@effect/platform-browser/BrowserSocket`) and `layerInMemoryFake` stay interchangeable. From the prototype and client design:

```ts
// Service shape settled in prototype/effect-transport-atoms and ticket 14
interface LspTransportService {
  readonly transport: Transport
  readonly events: Stream.Stream<TransportEvent>
  readonly reconnect: Effect.Effect<void>
  readonly disconnect: Effect.Effect<void>
}
```

- **Error model:** Model transport failures with `Data.TaggedError`: `TransportConnectError` and `TransportClosedError` (carrying WebSocket close `code` and `reason`).
- **Status model:** Derive the combined UI status (transport lifecycle plus `LSPClient.initializing` promise) in the session atom layer as a 5-state discriminated union:

```ts
// Status union settled in ticket 14
type LspStatus =
  | { readonly _tag: "connecting" }
  | { readonly _tag: "ready" }
  | {
      readonly _tag: "reconnecting"
      readonly attempt: number
      readonly maxAttempts: number
    }
  | { readonly _tag: "idle" }
  | {
      readonly _tag: "error"
      readonly code: "capacity" | "doc-too-large" | "policy" | "unreachable"
      readonly message: string
      readonly retryable: boolean
    }
```

- **Close-code policy and reconnect:**
  - `4000` (server idle eviction): stop reconnecting and enter `idle`. Wake lazily on user edit (`docChanged`), editor `focus`, or clicking the status indicator. Ignore passive pointer movement and background tabs.
  - `1006`, `1011`, `1013`, open/network errors, and `LSPClient.initializing` timeouts or rejections: close the socket if open and reconnect with jittered exponential backoff starting at 500 ms (factor 2, capped at 10 s), capped at 5 consecutive failed attempts before entering a retryable `error` state. Reset the attempt counter upon reaching `ready`. Trigger an automatic retry when the browser fires `online` or when the user clicks the status indicator.
  - `1008` (policy) and `1009` (`doc-too-large`): stop reconnecting and show an actionable `error`. For `doc-too-large`, keep `retryable: false` while the buffer exceeds 256 KiB (UTF-8 bytes) and flip `retryable` to `true` once the user trims the buffer below 256 KiB.
- **Buffer resync on reconnect:** Clear the pending outbound message queue before calling `client.disconnect()` and `client.connect(transport)` so stale frames from the dropped session never flush ahead of the new `initialize` handshake. Rely on `@codemirror/lsp-client`'s built-in `Workspace.connected()` to re-send `textDocument/didOpen` with the live edited buffer.
- **Cold-start timeout and non-blocking mount:** Configure `LSPClient` with `timeout: 10_000` (10 s) to cover Cloudflare Container cold starts. Mount `EditorView` immediately with Lezer TypeScript highlighting while the WebSocket connects in the background.
- **WebSocket endpoint:** Connect to same-origin `ws(s)://<location.host>/api/lsp` by default, with an optional `PUBLIC_LSP_WS_URL` environment variable override for local `astro dev` and E2E tests against standalone `packages/lsp-bridge`.
- **Effect Atom and React lifecycle:** Wrap `<Scratchpad>` in a per-instance `<RegistryProvider defaultIdleTTL={2000}>` with `Atom.runtime(transportLayer).pipe(Atom.setIdleTTL("2 seconds"))` so `React.StrictMode` double-mounts do not thrash sockets while unmounting disposes the registry and closes all scopes cleanly. Pass `{ elementAtom, statusAtom, editorAtom, reconnectAtom }` via a plain `ScratchpadSessionContext` instead of `ScopedAtom.make`. Keep CodeMirror `EditorState` as the single source of truth for document text (no mirrored text atom, no diagnostics list atom, and no extra `runtime.fn` LSP wrappers in v1).

## Testing Decisions

Tests verify external behavior through public module boundaries and real protocol frames, never internal implementation details.

### Seams

1. **Server bridge stdio seam:** Inject a fake child-process stdio service into `packages/lsp-bridge` so framing, quirk absorption, pull-to-push diagnostics, URI sandboxing, frame caps, idle eviction, and capacity limits run deterministically under Effect `TestClock` in Node.
2. **Client `LspTransport` seam:** Inject `layerInMemoryFake` paired with a controllable `FakeLspController` into the Scratchpad session atoms so close-code handling, jittered backoff, retry caps, lazy wake, `doc-too-large` recovery, outbound queue clearing, and `LspStatus` transitions run deterministically under `TestClock` in Node without `jsdom` or React Testing Library.
3. **Standalone WebSocket E2E seam:** Run Playwright against standalone `packages/lsp-bridge` + `astro dev` (via `PUBLIC_LSP_WS_URL`) so CI verifies real browser DOM mounting, live `tsrs` diagnostics, Effect quickinfo hover, and reconnect recovery without requiring Docker.

### Test tiers and prior art

- **Client and worker unit tests (`vp test`, Node):** Live alongside existing feature tests in `apps/web/test/features/` (following the pattern in `apps/web/test/features/playground/` and `apps/web/test/features/search/`). Cover `ScratchpadSession` + `LspTransport` state transitions via `FakeLspController` + `TestClock` + `AtomRegistry` + `LSPClient`, and cover `WebsiteWorker`'s `/api/lsp` `Origin` allowlist and upgrade routing logic with pure unit tests.
- **Server bridge unit and smoke tests (`vp test`, Node):** Live in `packages/lsp-bridge`. Run the deterministic fake-stdio + `TestClock` tier plus 1 to 2 live `tsrs` WebSocket smoke tests that spawn the local `tsrs` binary to verify Effect `TS377xxx` diagnostics, Effect quickinfo, and quirk parity on every test run.
- **Playwright E2E (`apps/web/test/e2e/scratchpad.spec.ts`):** Follows existing Playwright specs in `apps/web/test/e2e/` (such as `playground-file-sync.spec.ts`). Uses a dedicated Playwright project/config that starts standalone `packages/lsp-bridge` + `astro dev`, with a `SCRATCHPAD_URL` override to run the same spec against `alchemy dev` (Docker) or a deployed preview. Asserts non-blocking mount before LSP ready, preloaded Effect `TS377xxx` squiggles, hover Effect quickinfo, completions, and recovery after a dropped connection.
- **CI gating:** `.github/workflows/check.yml` gates on `vp test` (covering client, worker, and bridge unit + live `tsrs` smoke tests) plus a dedicated Playwright E2E job running `scratchpad.spec.ts`.
- **Manual pre-deploy checks:** Automated CI latency assertions and bundle-size scripts are skipped for v1. Before deploying, manually verify the Docker-backed `alchemy dev` + Cloudflare Container path, warm latency targets (<500 ms editable, <1.5 s first diagnostic/hover), and the Scratchpad client bundle size against the Playground's 2.69 MB gzip baseline.

## Out of Scope

- **Replacing the Playground (`/play`):** Separate follow-up effort gated on four criteria: multi-file editing wired to `/play`'s execution backend, full LSP parity, working Effect diagnostics, and verified wins on both client transfer size and time-to-first-diagnostic.
- **Browser-only TypeScript 6 Web Worker backend (`vtsls` or `@typescript/vfs`):** Ruled out for v1; `LspTransport` remains backend-agnostic if added later.
- **Code execution (`@webcontainer/api`, terminal output):** Not part of the Scratchpad.
- **Custom LSP client on Effect RPC:** Ruled out; `@codemirror/lsp-client` remains the client.
- **Multi-file editing and custom CodeMirror `Workspace`:** Deferred to v2.
- **Inline docs/blog embeds, URL sharing, `localStorage` persistence, and snippet or package pickers:** Deferred beyond v1.
- **Dynamic or multi-package installation beyond `effect`:** v1 bakes only `effect` (`4.1.x`) into `/workspace/node_modules`.
- **Code actions, inlay hints, and semantic tokens:** Deferred beyond v1.
- **Turnstile bot protection:** Deferred beyond v1 (`Origin` allowlist + per-IP `Cloudflare.RateLimit` handle v1 protection).

## Further Notes

- **Reference prototypes:** Two throwaway prototypes validated the core seams and remain on archived branches for reference: `prototype/ws-bridge-ts7` (commit `e9a31cf3`) and `prototype/effect-transport-atoms` (commit `00cb7acb`).
- **Hosting fallback:** If Cloudflare Container cold starts prove disruptive in production, the same `packages/lsp-bridge` Docker image can move to an always-on Fly.io Machine without changing the bridge protocol or browser client.
- **Implementation tickets:** Ordered tracer-bullet tickets live in `.scratch/codemirror-lsp/issues/17-*.md` through `22-*.md`.
