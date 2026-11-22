---
status: proposed
---

# In-browser Effect tsrs language server for the Scratchpad

The Scratchpad runs the Effect-patched tsrs language server in a module Web Worker on the page, built from this repo by `packages/tsrs-lsp-wasm` as one single-threaded `wasm32-wasip1` module. If accepted, this supersedes ADR 0001. The editor keeps `@codemirror/lsp-client` behind the same `LspTransport` service. `layerWorker` replaces `layerWebSocket` as the default, and `PUBLIC_LSP_TRANSPORT=websocket` still selects the server path.

The server path cost a container pool, cold starts of 1 to 3 s, rate limiting and an origin allowlist to give every visitor Effect diagnostics. The worker gives the same answers with no server. In the feature probe of experiment 05, 74 of 74 sub-probes matched the native Effect server in Node, Chromium, Firefox and WebKit. That covers diagnostics, Effect quick fixes, refactors, hover, completions, inlay hints and symbols. The page needs no cross-origin isolation and no SharedArrayBuffer.

## Considered options

- **Keep the server-hosted bridge (ADR 0001).** It works and stays in the repo, but it needs Cloudflare Containers, scale-to-zero cold starts and abuse limits, and it adds a network round trip to every request.
- **Stock `@tsrs/wasm` batch `tsc` in a worker (experiment 01).** It needs no patches, but each edit re-checks from scratch (about 0.3 s in Chromium after tuning), it has no Effect diagnostics, and it has no hover or completion.
- **Effect-patched batch module (experiment 04).** It gives the Effect diagnostics for 250 KB brotli more than stock and nothing else. A full check is still about 0.6 s per edit, with no quick fixes, hover or completions.
- **Threaded tsrs LSP on `wasm32-wasip1-threads` (experiment 02).** It runs, but it needs cross-origin isolation for SharedArrayBuffer and keeps 17 to 21 JS workers alive, about 750 MB to 1 GB of extra memory in Chromium and Firefox.
- **Single-threaded tsrs LSP with a message pump, Effect-patched (experiments 03 and 05, chosen).** One instance keeps its program and checker state between edits. An edit plus a diagnostics pull takes 15.1 ms in Chromium, 14 ms in WebKit and 58 ms in Firefox. First diagnostics arrive about 0.63 s after the assets are loaded in Chromium, 0.70 s in WebKit and 1.5 s in Firefox.

## Consequences

- **Self-hosted patches.** Neither tsrs nor Effect ships this build. `packages/tsrs-lsp-wasm` pins both upstreams by commit and carries the single-thread pump patch and the `ets_wasm_lsp` crate until upstream has them. A pin bump means rebasing the patch. CI builds the module with Rust 1.100.0 and binaryen and caches it on the package's inputs.
- **Download.** Visitors fetch the module (13.9 MB raw, 3.0 MB brotli, served as `application/wasm`) and the effect declarations pack (12.2 MB raw, 1.7 MB as the gzip file we serve, since CDNs do not compress `application/octet-stream`). Both are content-hashed files under `/_astro/` with immutable caching, so a returning visitor downloads them once per release. The editor is usable while they load, and the status badge shows the download, compile and start phases.
- **Memory.** The module's linear memory grows to about 254 MiB in a real session, the same in all three engines. That is fine on a desktop and heavy on a low-end phone.
- **Deep nesting.** Deeply nested code overflows the engine's native stack and kills the instance. Chromium survives 95 nested `Effect.gen` blocks and fails at 100. Bracket literals fail at 500 to 1500 depending on the engine. The host restarts the instance in about 0.4 s (1.5 s in Firefox), replays the session, and quarantines the document that caused the crash until its next edit. The Scratchpad shows a "Restarted" badge and a warning on that file. No real program comes close to these depths, but pasted or generated code can.
- **No cancellation.** Each request runs to completion before the next one. `$/cancelRequest` arrives too late to matter. The first auto-import registry build, about 400 ms of background work after the first edit, blocks requests that arrive during it.
- **Client-side bridge duties.** The worker now does what `packages/lsp-bridge` did. It turns pulled diagnostics into `publishDiagnostics` pushes, mirrors the Scratchpad Workspace into the server's in-memory file system, and strips `params: null` from `shutdown` and `exit`. This code lives in `lsp-worker-bridge.ts` with unit and integration tests.
- **Code actions, inlay hints and completion resolve.** The module answers them, but `@codemirror/lsp-client` 6.3.1 never sends those requests. The Effect quick fixes and refactors stay out of reach until the Scratchpad adds a code-action UI. That is follow-up work.
- **Server path retained.** `packages/lsp-bridge`, the `/api/lsp` gateway and the Cloudflare container config stay deployed and selectable with `PUBLIC_LSP_TRANSPORT=websocket`. Retiring them is a separate decision.
