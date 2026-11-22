# 03: single-threaded tsrs LSP with a message pump

The tsrs language server compiled to `wasm32-wasip1` (no threads, no SharedArrayBuffer, no COOP/COEP), kept alive
for the whole session and driven one JSON-RPC message at a time. Findings and numbers:
`../../research/03-single-thread-lsp.md`.

## Files

- `tsrs-single-thread-lsp.patch`: the tsrs changes, `git diff` against e083fd7 (7.1.0-beta.tsrs4), including the new
  `crates/tsrs_wasm_lsp` crate and `crates/tsrs_core/src/pump.rs`.
- `lsp-host.js`: runtime-agnostic host (WASI shim, `tsrs_host.fs` bridge over an in-memory file system, pump API).
- `session.js`: the measured session (shared by Node and the browser).
- `run-node.mjs`: Node runner. `run-native.mjs`: the same session against native `tsrs --lsp --stdio`.
- `browser/`: `index.html`, `page.js`, `worker.js` (the server in one module Worker, strings over `postMessage`),
  `run-browser.mjs` (Playwright harness, serves without cross-origin isolation headers).

## Module ABI (`crates/tsrs_wasm_lsp/src/lib.rs`)

| export                                    | meaning                                                                                          |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `lsp_input(len) -> ptr`                   | buffer for the next call's argument                                                              |
| `lsp_init(flags) -> 0`                    | creates the server; input = cwd. flag 1 = case-insensitive host fs                               |
| `lsp_message() -> status`                 | handles one JSON-RPC message (input, no Content-Length header), including a request's async work |
| `lsp_tick() -> status`                    | runs queued background tasks and due timers                                                      |
| `lsp_next_timer_ms() -> i64`              | ms until the next timer (idle cache clean, checker disposal), -1 if none                         |
| `lsp_output() -> ptr`, `lsp_output_len()` | outgoing messages since the last call, each JSON text followed by `\n`                           |

Status: 0 idle, 3 background work queued (call `lsp_tick` when idle), 1 exited, 2 fatal read error. Imports are
`tsrs_host.fs`/`fs_take` (same protocol as `@tsrs/wasm`) and WASI preview1 (clocks, random, fd_write, environ).

A host must: answer `client/registerCapability` (any reply; the server does not wait for it), call `lsp_tick` when
status is 3, and call `lsp_tick` again after `lsp_next_timer_ms`. A trap (panic = abort, engine stack overflow) kills
the instance; start a new one.

## Build

S is the scratch directory (`/tmp/claude-1000/-home-maxwellbrown--t3-worktrees-website-t3-ea6468bd-bd0da0eca35fa438/15abd0d2-80d4-4350-954f-da9d9d9fa38c/scratchpad`).

```sh
cp -r $S/src/tsrs $S/exp-pump/tsrs        # pristine e083fd7
cd $S/exp-pump/tsrs
git apply <repo>/.scratch/tsrs-web-worker/prototypes/03-single-thread-lsp/tsrs-single-thread-lsp.patch

# fast development build (~70 s from a warm target/, 26 MB module), what the timings below used
CARGO_PROFILE_RELEASE_LTO=off CARGO_PROFILE_RELEASE_CODEGEN_UNITS=16 CARGO_PROFILE_RELEASE_PANIC=abort \
  CARGO_PROFILE_RELEASE_STRIP=none \
  ../../rust/rs cargo build --release -p tsrs_wasm_lsp --target wasm32-wasip1
# -> target/wasm32-wasip1/release/tsrs_wasm_lsp.wasm

# size build (the settings of tools/wasm/build.sh: opt-level s, fat LTO, panic=abort, then wasm-opt -Os)
CARGO_PROFILE_RELEASE_OPT_LEVEL=s CARGO_PROFILE_RELEASE_LTO=fat CARGO_PROFILE_RELEASE_CODEGEN_UNITS=1 \
  CARGO_PROFILE_RELEASE_PANIC=abort CARGO_PROFILE_RELEASE_DEBUG=false CARGO_PROFILE_RELEASE_STRIP=debuginfo \
  CARGO_TARGET_WASM32_WASIP1_RUSTFLAGS="--remap-path-prefix=$PWD=/tsrs -C llvm-args=-inlinehint-threshold=150" \
  CARGO_TARGET_DIR=$PWD/target-opt \
  ../../rust/rs cargo build --release -p tsrs_wasm_lsp --target wasm32-wasip1
../../rust/rs wasm-opt --enable-bulk-memory --enable-mutable-globals --enable-nontrapping-float-to-int \
  --enable-sign-ext --enable-multivalue --enable-reference-types -Os --strip-debug --strip-producers \
  target-opt/wasm32-wasip1/release/tsrs_wasm_lsp.wasm -o <repo>/.scratch/tsrs-web-worker/artifacts/tsrs-lsp-single.wasm
```

Native baseline: `../../rust/rs cargo build --release -p tsrs_cli` (with `CARGO_PROFILE_RELEASE_LTO=off
CARGO_PROFILE_RELEASE_CODEGEN_UNITS=16`), binary `target/release/tsrs`.

## Run

```sh
cd <repo>/.scratch/tsrs-web-worker/prototypes/03-single-thread-lsp
node run-node.mjs <module.wasm> $S/exp --edits 50 --out /tmp/x.json      # --no-deep, --timers, --config, --verbose
node run-native.mjs $S/exp-pump/tsrs/target/release/tsrs $S/exp --edits 50
node browser/run-browser.mjs $S/exp --browsers chromium --edits 50 --wasm <module.wasm>
```

`$S/exp` must contain `node_modules/effect` (4.1.5). Deep-recursion probes open files with 500 to 10000 nested
brackets after the edits; the first depth that kills the instance ends the probe (it is the last step).

Firefox and WebKit on NixOS need shared libraries from nixpkgs. What worked here:

- Firefox: `FIREFOX_PATH=~/.cache/ms-playwright/firefox-1532/firefox/firefox PW_LD_LIBRARY_PATH=<lib dirs>`, with lib
  dirs from `nix build --no-link --print-out-paths` of alsa-lib atk cairo dbus.lib fontconfig.lib freetype gtk3
  gdk-pixbuf glib.out pango.out stdenv.cc.cc.lib xorg.libX11 xorg.libxcb xorg.libXcomposite xorg.libXcursor
  xorg.libXdamage xorg.libXext xorg.libXfixes xorg.libXi xorg.libXrandr xorg.libXrender xorg.libXtst libxkbcommon
  harfbuzz zlib libffi expat (each `/lib`).
- WebKit: the installed webkit-2311 speaks an older protocol than Playwright 1.63 ("Unknown setting:
  PushAPIEnabled"); webkit-2359 was downloaded into `$S/pw-browsers` with
  `PLAYWRIGHT_BROWSERS_PATH=$S/pw-browsers node <playwright>/cli.js install webkit`. It runs through a wrapper
  (`$S/exp-pump/webkit2359-run.sh`) that execs `minibrowser-wpe/bin/MiniBrowser` with the Firefox libs plus mesa,
  libglvnd (`__EGL_VENDOR_LIBRARY_DIRS=<mesa>/share/glvnd/egl_vendor.d`), libsoup_3, icu74, libjpeg8, lcms2,
  libxml2_13, flite.lib, libmanette, libpsl, nghttp2 and the other `ldd` misses. `WEBKIT_PATH=<wrapper>`.
