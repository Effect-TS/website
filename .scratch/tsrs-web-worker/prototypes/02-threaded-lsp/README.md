# 02: threaded `tsrs --lsp --stdio` as a wasm32-wasip1-threads module

The unmodified LSP code path of the tsrs CLI (`tsrs --lsp --stdio`, all of its OS threads) built for
`wasm32-wasip1-threads` and run under wasmtime, a Node 24 host and headless Chromium, Firefox and WebKit. Findings
and numbers are in `../../research/02-threaded-lsp.md`.

## Files

| file                                                                              | what it is                                                                                                                                                                              |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tsrs-wasm-threads.patch`                                                         | the tsrs source changes, `git diff` against e083fd7 (14 files, +57 -21)                                                                                                                 |
| `build-threads.sh`                                                                | release build of `tsrs_cli` for `wasm32-wasip1-threads` (copied into the tsrs checkout)                                                                                                 |
| `wasi-threads.js`                                                                 | WASI preview 1 + `wasi.thread-spawn` host shared by Node and the browser: read-only in-memory file system, process-wide fd table, stdin ring and thread pool, all in SharedArrayBuffers |
| `thread-worker.js`                                                                | one pooled wasm thread (Node `worker_threads` Worker or browser module Worker)                                                                                                          |
| `node-host.mjs`                                                                   | Node host: `node node-host.mjs [--mount host:guest] [--pool n] [--stack-mb n] [--env K=V] <module.wasm> args...`                                                                        |
| `lsp-session.js`                                                                  | the measured LSP session (initialize, didOpen, pull diagnostics, hover, completion, definition, edits, shutdown) and the deep-recursion probe; no Node APIs                             |
| `lsp-drive.mjs`                                                                   | runs the session against any stdio server command and prints timings, threads and RSS                                                                                                   |
| `measure.sh`                                                                      | native vs wasmtime vs Node host, three runs each                                                                                                                                        |
| `browser/serve.mjs`                                                               | static server with COOP `same-origin` and COEP `require-corp`; serves the module and the packed workspace                                                                               |
| `browser/index.html`, `browser/page.js`                                           | the browser harness (query: `pool`, `parallelism`, `stackMB`, `edits`, `gap`, `deep`, `enc`)                                                                                            |
| `browser/run-playwright.mjs`, `browser/run-one.sh`, `browser/measure-browsers.sh` | headless runs with the NixOS workarounds                                                                                                                                                |
| `workspace/`                                                                      | `tsconfig.json` (the lsp-bridge workspace config) and `main.ts` (Effect program with one planted TS2322)                                                                                |
| `setup.sh`                                                                        | recreates the layout below from the scratch directory                                                                                                                                   |

Built modules (gitignored): `../../artifacts/tsrs-lsp-threads.wasm` (release, opt-level s, fat LTO, names kept) and
`../../artifacts/tsrs-lsp-threads.opt.wasm` (the same after `wasm-opt -Os`).

## Layout and setup

`S` is the session scratch directory (it holds `rust/rs`, `src/tsrs` and `exp/node_modules`). The scripts assume:

```
$S/exp-threads/tsrs   patched tsrs checkout (own target/)
$S/exp-threads/host   this directory's hosts and harness
$S/exp-threads/ws     tsconfig.json, main.ts, node_modules/effect (.d.ts + package.json from effect 4.1.5)
```

```sh
S=<scratch dir> ./setup.sh
```

## Build

```sh
cd $S/exp-threads/tsrs
$S/rust/rs ./build-threads.sh          # about 3 to 4 minutes; writes target/wasm32-wasip1-threads/release/tsrs.wasm
# optional size pass (13 s):
$S/rust/rs wasm-opt --enable-threads --enable-bulk-memory --enable-mutable-globals --enable-sign-ext \
  --enable-nontrapping-float-to-int --enable-multivalue --enable-reference-types -Os --strip-debug --strip-producers \
  target/wasm32-wasip1-threads/release/tsrs.wasm -o tsrs-lsp-threads.opt.wasm
```

`build-threads.sh` sets: opt-level s, fat LTO, one codegen unit, panic = abort, and
`RUSTFLAGS=-C link-arg=--max-memory=4294967296 -C link-arg=-zstack-size=8388608 --cfg tsrs_wasm_threads`.
The `--cfg tsrs_wasm_threads` flag is required (see the research note: without it `tsrs_core::NO_THREADS` is true
and the server deadlocks). A native baseline for comparison:

```sh
CARGO_TARGET_DIR=$PWD/target-native CARGO_PROFILE_RELEASE_LTO=off CARGO_PROFILE_RELEASE_CODEGEN_UNITS=16 \
  $S/rust/rs cargo build --release -p tsrs_cli --locked
```

## Run

Runtime knobs (guest environment variables added by the patch): `TSRS_WASM_PARALLELISM` (what
`available_parallelism` reports; default std's answer), `TSRS_WASM_THREAD_STACK_MB` (shadow stack of every compiler
thread, default 16). `RAYON_NUM_THREADS` is read by rayon itself.

```sh
cd $S/exp-threads/host
WASM=../tsrs/target/wasm32-wasip1-threads/release/tsrs.wasm

# wasmtime sanity check (module problems vs host problems)
WT=$(nix shell nixpkgs#wasmtime -c which wasmtime)
node lsp-drive.mjs --root /ws -- $WT run -S threads -W threads,shared-memory --env TSRS_WASM_PARALLELISM=4 \
  --dir ../ws::/ws $WASM --lsp --stdio

# Node host (add --usr2 to the driver for wasm memory and thread counts; HOST_STACKS=1 also dumps every thread's stack)
node lsp-drive.mjs --root /ws --usr2 -- node node-host.mjs --pool 24 --env TSRS_WASM_PARALLELISM=4 \
  --mount ../ws:/ws $WASM --lsp --stdio
# eager TurboFan instead of V8's lazy Liftoff-first tiering:
node lsp-drive.mjs --root /ws -- node --no-liftoff --no-wasm-lazy-compilation node-host.mjs --pool 24 \
  --env TSRS_WASM_PARALLELISM=4 --mount ../ws:/ws $WASM --lsp --stdio
# deep recursion probe (N terms of 1 + 1 + ...), with a bigger V8 stack per worker
node lsp-drive.mjs --root /ws --deep 20000 -- node node-host.mjs --pool 24 --stack-mb 64 --mount ../ws:/ws $WASM --lsp --stdio

# native baseline
node lsp-drive.mjs --root $PWD/../ws -- ../tsrs/target-native/release/tsrs --lsp --stdio

# everything above, three runs
../measure.sh

# browsers
node browser/serve.mjs $WASM ../ws 8765 &
browser/run-one.sh chromium "http://127.0.0.1:8765/browser/index.html?pool=24&parallelism=4"
browser/run-one.sh firefox  "http://127.0.0.1:8765/browser/index.html?pool=24&parallelism=4"
browser/run-one.sh webkit   "http://127.0.0.1:8765/browser/index.html?pool=24&parallelism=4"
browser/run-one.sh chromium "http://127.0.0.1:8765/browser/index.html?pool=24&parallelism=4&deep=1000"
browser/run-one.sh chromium blank      # memory baseline of the same browser
browser/measure-browsers.sh "pool=24&parallelism=4" 3
```

NixOS notes: Chromium is Playwright 1.63's own build. Firefox uses the older cached `firefox-1532` build with GTK
libraries from nixpkgs on `LD_LIBRARY_PATH` (`ffld.txt`); Playwright 1.63 wants `firefox-1543`, which is not
cached. WebKit uses nixpkgs' `playwright-driver` 1.59.1 (WebKit 26.4 WPE) with its own Playwright client and Mesa's
software EGL (`LIBGL_ALWAYS_SOFTWARE=1`, `__EGL_VENDOR_LIBRARY_FILENAMES`).

## Host design in one paragraph

Every wasm thread is its own JS worker, and the pool is created up front (`--pool`, default 24 in the browser) because
a blocked worker cannot wait for a new Worker to start. Each worker instantiates the module on the one shared
`WebAssembly.Memory` and then waits on its slot in a SharedArrayBuffer; `wasi.thread-spawn` claims an idle slot with a
compare-and-swap and wakes it with `Atomics.notify`, so spawning never needs any event loop. Slot 1 runs `_start`. The
fd table, the stdin ring and the file system image are SharedArrayBuffers too, so an fd opened on one thread works on
every other. stdin is fed by the embedder (`process.stdin` in Node, `postMessage`-free `stdinPush` from the page) and
`fd_read(0)` blocks with `Atomics.wait`; stdout goes to `fs.writeSync(1)` in Node and to `postMessage` in the browser.
The file system is read-only: writes return `EROFS`.
