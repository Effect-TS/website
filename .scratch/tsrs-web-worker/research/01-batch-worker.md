# Experiment 01: stock @tsrs/wasm batch tsc in a browser Web Worker

Question: can the unmodified `@tsrs/wasm@7.1.0-beta.tsrs4` package (batch `tsc`, one fresh WASM instance per call) run in a browser Web Worker behind a diagnostics-only LSP shim, and is it fast and robust enough to be a fallback for the Scratchpad's server-hosted TypeScript LSP?

Short answer: in Chromium, yes for ordinary small Effect programs. A full re-check takes about 0.3 s per edit after the cheap fixes below, and diagnostics are correct. The blocking problems are a small worker stack in Chromium (a 1,000-term `1 + 1 + ...` already overflows) and the fact that Firefox and WebKit could not be launched on this machine, so neither is measured.

## What I built

Everything lives in `.scratch/tsrs-web-worker/prototypes/01-batch-worker/`. There are no dependencies beyond Node 24 and the repo root's Playwright 1.63.0.

- `prepare.mjs` copies the stock `tsrs.wasm`, `core.js` and `browser.js` into `.scratch/tsrs-web-worker/artifacts/tsrs/` (gitignored). It also builds two packs of Effect 4.1.5's 627 `.d.ts` and `package.json` files: `effect-pack.json` (a `{path: text}` object) and `effect-pack.bin` (a little-endian u32 header length, a JSON header `{path: [offset, length]}`, then one UTF-8 blob). Each pack also gets `.gz` and `.br` copies, and the sizes go to `artifacts/sizes.json`.
- `serve.mjs` is a static server for `.scratch/tsrs-web-worker/`. It sends COOP/COEP headers (so the page is `crossOriginIsolated`), serves `application/wasm`, and serves the precompressed `.br` file when the browser accepts it.
- `worker.js` is a module Web Worker that holds the virtual file system: the Effect pack, the open documents, and a tsconfig equal to `packages/lsp-bridge/workspace.tsconfig.json` plus `skipLibCheck: true`. It speaks bare JSON-RPC strings over `postMessage`, the same wire shape `@codemirror/lsp-client`'s `Transport` uses. It handles `initialize` (advertising full sync and `positionEncoding: "utf-16"`), `initialized`, `textDocument/didOpen`, `didChange` (full text), `didClose`, `shutdown` and `exit`. Any other request gets JSON-RPC error `-32601 Method not found` (verified for `textDocument/hover`). After a debounced re-check it pushes `textDocument/publishDiagnostics` with the document `version`. tsrs's UTF-16 `pos`/`end` offsets are converted to LSP line/character with a line-start table and binary search. A tsrs crash (exit 5) becomes an error diagnostic at 0:0 of the first open file. Two non-standard messages support the harness: a `$/tsrs/timing` notification per check, and a `$/tsrs/checkFiles` request for one-off checks.
- `page.js` and `index.html` form a minimal LSP client that runs the scenarios and returns JSON.
- `run.mjs` is the one command. It runs `prepare.mjs` if the artifacts are missing, starts the server, and runs every configuration in a fresh Playwright context per browser. It samples renderer RSS from `/proc` (only processes descended from the harness) and writes `artifacts/results-<browser>.json` and `artifacts/summary.json`.

Run it with:

```sh
node .scratch/tsrs-web-worker/prototypes/01-batch-worker/run.mjs
# options: --browsers chromium --configs custom-hostfs,custom+fast --edits 20 --no-stress --tag name
```

The first run spends about 80 s in `prepare.mjs`, almost all of it brotli quality 11. A full Chromium run then takes about 4 minutes.

### Stale results and latest-edit-wins

A check runs synchronously inside the worker, so a `didChange` that arrives mid-check waits in the worker's message queue. After every check the worker yields one macrotask (`setTimeout(0)`), which lets queued messages land. It then compares each open document's version with the snapshot it checked. If any version changed, the result is dropped as stale. It is never published, and the edit that made it stale has already scheduled a new check. Every publish carries `version`, so a client could also drop out-of-order results itself. A check in progress cannot be cancelled. The only real cancellation would be `worker.terminate()` plus a respawn, which I did not build.

## Results

All numbers come from headless Chromium 153.0.8010.12 (Playwright's chromium-1243 headless shell) on the 32-core NixOS machine, served from 127.0.0.1. Other experiments were running on the same machine at the same time, so timings move by roughly 10 to 15 percent between runs. I ran the main configurations twice: run 1 with 10 edits each, and a repeat with 20 edits each. Unless a cell is marked as an estimate, I measured it.

### Download sizes (measured, Node zlib: gzip -9, brotli q11)

| Asset                              |        Raw |      gzip |    brotli |
| ---------------------------------- | ---------: | --------: | --------: |
| `tsrs.wasm`                        | 10,041,556 | 2,910,150 | 1,986,988 |
| Effect pack, JSON (`{path: text}`) | 12,643,984 | 1,699,737 | 1,237,870 |
| Effect pack, binary (chosen)       | 12,215,834 | 1,686,939 | 1,232,517 |

Chosen format: the binary pack. Compressed it is the same size as the JSON pack, but the worker reads it as one `ArrayBuffer` and makes a zero-copy `Uint8Array` view per file. There is no JSON parse of 12 MB of strings, and nothing gets re-encoded on each check. One brotli download of both is about 3.2 MB. At 20 Mbit/s that would take about 1.3 s; this is an estimate, since I only measured localhost.

Only 176 of the 627 Effect files (241 files and 294k lines including the standard libraries) are loaded by the test program's `import { ... } from "effect"`. A pruned pack would download less, but every check still parses all 176.

### Startup (measured)

| Step                                                               |                            Time |
| ------------------------------------------------------------------ | ------------------------------: |
| `WebAssembly.compileStreaming(fetch(wasm))`, brotli over localhost |                    85 to 112 ms |
| Non-streaming: `fetch` + `arrayBuffer` / `WebAssembly.compile`     | 94 ms / 13 ms (107 ms in total) |
| Pack fetch + decode, JSON pack to strings                          |                   235 to 278 ms |
| Pack fetch + decode, binary pack to views                          |                    70 to 123 ms |
| Worker spawn to `initialize` result, custom setup                  |                   174 to 249 ms |
| First check (cold instance, Liftoff code)                          |                   500 to 780 ms |
| Page navigation to first diagnostics, baseline                     |               1,127 to 1,263 ms |
| Page navigation to first diagnostics, custom setup                 |                 751 to 1,073 ms |

Streaming and non-streaming compilation are the same on localhost. V8 compiles lazily, so `WebAssembly.compile` returns after about 13 ms and the real compile cost moves into the first check, which is why that check is about 200 ms slower than later ones. On a real network, streaming should overlap compilation with the download (an inference, not measured).

### Per-edit latency and memory (measured)

Latency is measured from `didChange` posted to `publishDiagnostics` received, with a 0 ms debounce and one edit at a time. Odd edits fix the planted error and even edits restore it. "wasm run" is the time inside `tsrs_run` (custom host only). `memoryBytes` was 140,902,400 to 141,230,080 bytes (134 to 135 MiB) for every configuration and every edit. RSS is the renderer process (page plus worker) after the edits.

| Config                      | What changes                                                             | Median, run 1 (n=10) | Median, repeat (n=20) | wasm run (repeat) |         Renderer RSS / peak |
| --------------------------- | ------------------------------------------------------------------------ | -------------------: | --------------------: | ----------------: | --------------------------: |
| `baseline`                  | stock `tsc`, JSON pack strings, browser.js fetches and caches the module |               420 ms |                393 ms |               n/a | 309 to 410 / 410 to 488 MiB |
| `arraybuffer-compile`       | non-streaming startup compile                                            |               421 ms |          not repeated |               n/a |                     411 MiB |
| `compile-each-call`         | new `compileStreaming` (cache-busted URL) every check                    |               510 ms |          not repeated |               n/a |                     596 MiB |
| `precompiled-module`        | pass `module`                                                            |               433 ms |                383 ms |               n/a |              398 to 460 MiB |
| `uint8array-files`          | `files` values are views into the binary pack                            |               368 ms |                346 ms |               n/a |               224 / 268 MiB |
| `custom-hostfs`             | `core.runTscAsync` + indexed `HostFileSystem`                            |               340 ms |                308 ms |            303 ms | 181 to 220 / 264 to 305 MiB |
| `custom+fast`               | plus `TSRS_FAST=1`                                                       |               317 ms |                291 ms |            286 ms |              212 to 280 MiB |
| `stock+incremental`         | stock `tsc` + `--incremental`, `.tsbuildinfo` fed back                   |               510 ms |          not repeated |               n/a |               349 / 402 MiB |
| `custom+incremental-mtime0` | custom host, all mtimes 0                                                |               356 ms |          not repeated |            350 ms |               222 / 267 MiB |
| `custom+incremental`        | custom host, mtime bumped on edit                                        |               355 ms |                316 ms |            311 ms | 185 to 223 / 268 to 311 MiB |
| `custom+fast+incremental`   | both                                                                     |               336 ms |          not repeated |            330 ms |               248 / 253 MiB |
| `custom+lib-es2022`         | `lib: ["ES2022"]` (drops lib.dom; changes semantics)                     |               297 ms |                277 ms |            272 ms | 214 to 252 / 251 to 286 MiB |

Instantiating a fresh instance with `WebAssembly.instantiate` took 4.7 to 5.2 ms per check (median, measured). JS-side preparation in the custom host took 0.1 ms.

`performance.measureUserAgentSpecificMemory` is not usable here. The page was `crossOriginIsolated` and a secure context, but the call threw `SecurityError: Failed to execute 'measureUserAgentSpecificMemory' on 'Performance': performance.measureUserAgentSpecificMemory is not available.` I got the same error with no flags, `--enable-blink-features=MeasureMemory`, `--enable-features=MeasureMemory --enable-blink-features=ForceEagerMeasureMemory`, and `--headless=new`. My guess is that the headless shell does not ship it. That is why RSS from `/proc` is used instead. RSS includes the page and V8 heaps and is only approximate.

### Where the time goes (measured, `--extendedDiagnostics` in the browser worker, 4th of 4 runs)

| Variant                                     | Files |   Lines |   Parse |    Bind |   Check |   Total |
| ------------------------------------------- | ----: | ------: | ------: | ------: | ------: | ------: |
| barrel import `from "effect"`               |   241 | 294,464 | 0.227 s | 0.059 s | 0.014 s | 0.303 s |
| barrel, `--fast`                            |   241 | 294,464 | 0.226 s | 0.037 s | 0.015 s | 0.283 s |
| subpath imports `from "effect/Effect"` etc. |   182 | 244,479 | 0.186 s | 0.050 s | 0.012 s | 0.250 s |
| barrel, `--lib ES2022`                      |   235 | 248,018 | 0.192 s | 0.042 s | 0.011 s | 0.246 s |

About three quarters of every check is re-parsing the same declaration files, because no state survives between instances. Type-checking the user's file is about 15 ms. This is the core limit of the batch module. An LSP-capable or state-reusing build would remove most of the per-edit cost; no option of the stock package can.

### Correctness (measured)

- Every configuration reported exactly one TS2322 ("Type 'number' is not assignable to type 'string'.") at `{line 6, character 8}` to `{line 6, character 13}`, which is the `label` identifier on the planted line. The page computes the expected range independently from the text. All 10 or 20 alternating fix/restore edits gave the right diagnostics in every configuration, including the three incremental ones.
- Latest-edit-wins: edit A was sent, then B (fixed) 100 ms later during A's check, then C (two errors) straight after B. In every configuration A's result was dropped as stale and B was never checked. C was published once, with both TS2322 ranges correct, and nothing was published after it.
- Debounce: five edits 30 ms apart with a 150 ms debounce cost exactly one check in every configuration. The time from the last edit to diagnostics was 426 to 865 ms (the 150 ms debounce plus one check).
- `textDocument/hover` returned `{"code":-32601,"message":"Method not found: textDocument/hover"}`.
- Not exercised: the crash-to-diagnostic path through the LSP. The stress tests used `$/tsrs/checkFiles`, which returns the exit code directly.

### Ideas to cut the per-edit cost, deltas against `baseline`

| Idea                                                        |                 Delta, repeat run |                                      Delta, run 1 | Verdict                                                                                                                                                                                                                                      |
| ----------------------------------------------------------- | --------------------------------: | ------------------------------------------------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pass a precompiled `module`                                 |                            -10 ms |                                            +13 ms | Zero within noise. `browser.js` already caches the compile promise in a module-level variable, so "fetch each time" never happens with the stock API.                                                                                        |
| Actually recompiling every call (what the cache prevents)   |                      not repeated | +90 ms (compile 102 ms per call) and RSS +190 MiB | Never do this.                                                                                                                                                                                                                               |
| `Uint8Array` values in `files` (binary pack)                |                            -47 ms |                                            -52 ms | Avoids `TextEncoder` over 12 MB per call. It also cuts startup by about 180 ms because no JSON parse is needed.                                                                                                                              |
| Custom `HostFileSystem` via `@tsrs/wasm/core` `runTscAsync` |                            -85 ms |                                            -80 ms | The stock `memoryFileSystem` rebuilds its Map on every call, and its `isDir` scans every key on each `stat`; there were 556 stats and 180 reads per check. The custom host indexes directories once. RSS also drops by about 100 to 200 MiB. |
| `TSRS_FAST=1` on top of the custom host                     |                            -17 ms |                                            -23 ms | Small but consistent; it mostly speeds up binding.                                                                                                                                                                                           |
| `--incremental`, plain, `.tsbuildinfo` fed back             |                    +8 ms (custom) |        +15 ms (custom), +90 ms (stock, noisy run) | No gain. Each fresh instance still parses and binds everything, and the user file is the only file that gets checked anyway. It is correct, though: see below.                                                                               |
| `lib: ["ES2022"]` (no lib.dom)                              |             -31 ms against custom |                             -43 ms against custom | Real, but it changes the type environment compared with the server config.                                                                                                                                                                   |
| Subpath imports instead of the `effect` barrel              | -53 ms of tsc time (phases table) |                                                   | This depends on the user's code, so it is not a shim option.                                                                                                                                                                                 |

Best combination measured: custom host with `TSRS_FAST=1`, 291 ms median (282 to 324 ms) against 393 ms for the naive use, a 26 percent cut. Stacking `lib: ES2022` on top was not measured; I estimate about 260 ms.

### Incremental mode and tsrs issue #1042

Plain `--incremental` (not `-b`) has no #1042 problem. In the browser, with the stock `memoryFileSystem` (all mtimes 0) and with my custom host (mtimes 0, or bumped on every edit), every edit after the first was re-checked correctly, and `/p/.tsbuildinfo` was written each call. I reproduced the contrast in Node with the same package:

- `--incremental`: the second run exited 2 with `a.ts(1,14): error TS2322: Type 'string' is not assignable to type 'number'.`
- `-b` on a composite project: the second run exited 0 with empty output. This is issue #1042 (still open; fix PR #1043 assigns monotonic mtimes in `memoryFileSystem`), and it still reproduces on `7.1.0-beta.tsrs4`.

The shim does not use `-b`, and `-b` refuses JSON diagnostics anyway.

### Stress test: deep nesting (Chromium, measured)

These ran through `$/tsrs/checkFiles` with the custom host, one fresh instance per case.

| Input                                                              | Result                                                                                                                                                                                      |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `1 + 1 + ...`, 500 terms                                           | ok, exit 0                                                                                                                                                                                  |
| 1k, 2k, 3k, 5k, 20k terms                                          | exit 5 within 47 to 160 ms: `error: tsrs.wasm trapped (RangeError: Maximum call stack size exceeded); a stack overflow on deeply nested code or running out of memory are the usual causes` |
| `Effect.succeed(0).pipe(Effect.map(...))` chained 200 / 500 times  | ok                                                                                                                                                                                          |
| the same chained 1,000 times                                       | exit 5, same RangeError                                                                                                                                                                     |
| nested `Effect.flatMap(...)`, depth 100 / 250                      | ok                                                                                                                                                                                          |
| nested `Effect.flatMap(...)`, depth 500                            | exit 5, same RangeError                                                                                                                                                                     |
| nested `Effect.succeed(...)`, depth 50 / 200, assigned to `string` | ok, correct TS2322                                                                                                                                                                          |
| nested `Effect.gen` with `yield*`, depth 50 / 100                  | ok                                                                                                                                                                                          |
| nested `Effect.gen`, depth 200                                     | exit 5, same RangeError                                                                                                                                                                     |

The failure is V8's native stack in the worker thread, not tsrs's 80 MiB shadow stack: `memoryBytes` stayed at 101 to 134 MiB and the error is a `RangeError`. The worker survives, and the next check runs normally. Launching Chromium with `--js-flags=--stack-size=16000` changed nothing (identical thresholds), so a page has no way to raise this limit. For comparison, the tsrs notes say Node needs a 256 MB worker stack and then handles 100k terms. In a Chromium worker the limit is somewhere between 500 and 1,000 terms. Typical Effect code (pipelines of tens of steps, gen nesting of a few levels) is far below these limits, but generated or pathological code will hit them. The shim turns the crash into a "tsrs crashed" diagnostic at 0:0 rather than failing silently.

## What did not work

- Firefox: Playwright 1.63 wants `firefox-1543`, which is not installed (`browserType.launch: Executable doesn't exist at /home/maxwellbrown/.cache/ms-playwright/firefox-1543/firefox/firefox`). The installed `firefox-1532` fails with `XPCOMGlueLoad error for file .../libmozgtk.so: libgtk-3.so.0: cannot open shared object file: No such file or directory`. Pointing `LD_LIBRARY_PATH` at libraries from `/nix/store` got further but then failed with `/nix/store/...-glibc-2.42-100/lib/libm.so.6: version 'GLIBC_2.44' not found (required by /nix/store/...-sqlite-3.53.3/lib/libsqlite3.so)`. The system closure has no GTK at all, so I stopped there.
- WebKit: Playwright wants `webkit-2359`, which is not installed (`Executable doesn't exist at /home/maxwellbrown/.cache/ms-playwright/webkit-2359/pw_run.sh`). The installed `webkit-2311` fails with `MiniBrowser: error while loading shared libraries: libgstreamer-1.0.so.0: cannot open shared object file: No such file or directory`.
- So none of the Firefox or Safari behaviour is measured, including the README's warning that Safari's worker stack overflows first. Given that Chromium already overflows at 1k terms, Safari is likely lower still (an inference). The harness takes `FIREFOX_PATH`, `WEBKIT_PATH` and `PW_LD_LIBRARY_PATH` for a machine where they launch, and Firefox's overflow would show up as `InternalError: too much recursion`. `core.js`'s `isTrap` does not recognise that error, so it would be rethrown and reach the shim's error handler instead of becoming exit 5 (an inference from the code, not run).
- `performance.measureUserAgentSpecificMemory`: unavailable (error text above).
- One harness bug cost a run: a bad scripted edit corrupted `page.js` (a 4.3 MB file), so the first full run timed out in `page.waitForFunction`. The file was restored and all reported numbers come from later runs.

## Verdict

As a diagnostics-only fallback in Chromium, this is good enough for the Scratchpad's typical snippets. The download is about 3.2 MB brotli and is cacheable. Diagnostics arrive about 0.8 to 1.1 s after page load on localhost; on a real connection add the download, about 1.3 s at 20 Mbit/s (estimate). After that a check costs about 0.3 s, plus whatever debounce is chosen. Diagnostics are correct, and stale results are handled cleanly by version checks. The stock package needs two cheap changes to get there: zero-copy `Uint8Array` file contents, and a custom `HostFileSystem` through `@tsrs/wasm/core`. Incremental mode and passing a precompiled module do nothing for this workload.

It is not a replacement for the server LSP. There is no hover, completion or go-to-definition. Each edit re-parses about 294k lines of declarations, so cost grows with what the user imports, not with what they changed. Each check also allocates a fresh 134 MiB linear memory and relies on GC to reclaim the last one. Chromium's worker stack fails on moderately deep expressions (1k-term sums, 1k-step `.pipe` chains, 200-deep nested `Effect.gen`). Firefox and Safari are untested here, and Safari is the browser most likely to be worse. Before shipping, measure on a machine where Firefox and WebKit launch, and decide how the UI explains the "too deeply nested" failure.
