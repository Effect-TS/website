# `@website/lsp-bridge`

Standalone WebSocket-to-stdio LSP bridge for the `/scratchpad` CodeMirror 6 editor, backed by `@effect/tsgo`'s Rust `tsrs --lsp --stdio` binary.

## Local development

Run the bridge directly without Docker:

```bash
HOST=127.0.0.1 PORT=8787 node packages/lsp-bridge/src/server.ts
```

Point `astro dev` at the local bridge via `PUBLIC_LSP_WS_URL`:

```bash
PUBLIC_LSP_WS_URL=ws://127.0.0.1:8787 vp -C apps/web exec astro dev
```

## Testing

- **Unit + live `tsrs` smoke tests (no Docker):**
  ```bash
  vp test
  ```
- **Scratchpad Playwright E2E (standalone `packages/lsp-bridge` + `astro dev`, no Docker):**
  ```bash
  vp run test:e2e:scratchpad
  ```
- **Against `alchemy dev` (Docker) or a deployed preview:**
  ```bash
  SCRATCHPAD_URL=http://localhost:14337 vp run test:e2e:scratchpad
  ```

## Manual Pre-Deploy Verification Checklist

Automated CI verifies unit tests, live `tsrs` smoke tests, and Playwright E2E against the standalone localhost bridge. Before deploying Scratchpad or `packages/lsp-bridge` changes to production, verify the following manually:

### 1. Docker `alchemy dev` + Cloudflare Container path

- [ ] Start the full stack locally with Docker running:
  ```bash
  WEBSITE_REVISION=$(git rev-parse HEAD) vp exec alchemy dev
  ```
- [ ] Run the Scratchpad E2E suite against the container-backed `/api/lsp` gateway:
  ```bash
  SCRATCHPAD_URL=http://localhost:14337 vp run test:e2e:scratchpad
  ```
- [ ] Verify `/api/lsp` WebSocket upgrade succeeds from an allowed `Origin` and rejects a disallowed `Origin` (`403`).
- [ ] Verify container cold start completes within the 10 s `LSPClient` handshake timeout without manual reload.
- [ ] Leave `/scratchpad` idle for >1 minute and verify the container evicts the session with close code `4000`, the status badge transitions to `Idle · Wake`, background tabs do not auto-reconnect, and typing/focusing/clicking wakes the session and resyncs diagnostics.

### 2. Warm latency targets

Measure on a warm container (or warm preview deployment) in Chromium DevTools Network + Performance tabs:

- [ ] **Time to editable:** `< 500 ms` from navigation start until CodeMirror accepts typing with Lezer TypeScript syntax highlighting.
- [ ] **First diagnostic & hover quickinfo:** `< 1.5 s` warm from navigation start until the preloaded Effect `TS377001` floating-effect diagnostic squiggle renders and hovering `program` displays `Effect.Effect<number, never, never>`.

### 3. Scratchpad client bundle size vs `/play` baseline

Build `apps/web` (`vp run build`) and inspect the emitted client assets loaded by `/scratchpad`:

- [ ] Confirm `/scratchpad` does **not** pull `@effect/monaco-editor` or `@webcontainer/api`.
- [ ] Confirm total gzipped JS transferred by `/scratchpad` stays well below `/play`'s **2.69 MB gzip** baseline (target: ~184 KB gzip CodeMirror + LSP shell).
