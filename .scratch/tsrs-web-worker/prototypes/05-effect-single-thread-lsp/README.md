# 05: the Effect-patched tsrs language server, single-threaded, in one Web Worker

Prototype 03's single-thread pump applied to Effect's patched tsrs, with a cdylib that registers the three Effect hook
crates (checker, execute, language service) before creating the server. The module runs the whole Effect language
service in one Web Worker with no threads, no SharedArrayBuffer and no cross-origin isolation. Findings and numbers:
`../../research/05-effect-single-thread-lsp.md`.

## Files

- `tsrs-single-thread-lsp-on-effect.patch`: prototype 03's patch rebased onto Effect's tsrs. Base: oxc-project/tsrs
  `fd57202` (7.1.0-beta.tsrs4) with effect-tsgo `0e87d44`'s `_patches/tsrs/*.patch` applied in bytewise filename order.
  14 files, +596 -8. It leaves out `Cargo.lock` (the tsrs workspace's own lock only matters for standalone builds,
  which also need `../04-effect-wasm/tsrs-standalone-cargo-lock.patch`). The only conflict against 03's patch was the
  `pub use server::{..}` line in `crates/tsrs_lsp/src/lib.rs`, which Effect's patch 150 moved.
- `effect-tsgo-ets_wasm_lsp.patch`: the new crate `crates/ets_wasm_lsp` and its `Cargo.lock` entry. Base:
  Effect-TS/tsgo `0e87d44` with `../04-effect-wasm/effect-tsgo-ets_wasm.patch` applied (that patch carries the
  tsrs-version lock sync repoctl does).
- `ets_wasm_lsp/`: the same crate as plain files. `src/lib.rs` is tsrs's `crates/tsrs_wasm_lsp/src/lib.rs` (from the
  patch above) plus `register_hooks()` (the three `init()`s, as `crates/ets_tsrs/src/main.rs`): 13 added lines and one changed
  `#[path]`.
- `lsp-host.js`: prototype 03's host plus `startRecoveringServer` (crash detection, restart, replay, quarantine).
- `workspace.js`: the in-memory workspace (bridge tsconfig, Scratchpad default files, planted-issue files).
- `client.js`: a minimal LSP client over the pump (CodeMirror and VS Code-like capability sets).
- `features.js`: the feature probe (diagnostics, code actions and applied fixes, refactors, hover, completions and
  resolve, inlay hints, document symbols, and every request the Scratchpad client sends), normalized for diffing.
- `session.js`: the timed session (Scratchpad capabilities, 5 open files, 50 edits with pull + hover each).
- `deep.js`: nesting limits for Effect-style shapes, with recovery checks.
- `native-server.mjs`: the native `tsrs --lsp --stdio` reference behind the same interface.
- `run-node.mjs`: Node runner for `features`, `session`, `deep`, on wasm or `--native`.
- `compare.mjs`: diffs two feature dumps.
- `browser/`: `index.html`, `page.js`, `worker.js` (one module Worker with the recovering host), `run-browser.mjs`.
- `scripts/build-wasm.sh`: release build (opt-level s, fat LTO, one codegen unit, panic=abort, `wasm-opt -Os`).
- `scripts/node-matrix.sh`, `scripts/summarize-matrix.mjs`: the Node timing matrix.

## Module ABI

Unchanged from prototype 03 (`lsp_input`, `lsp_init`, `lsp_message`, `lsp_tick`, `lsp_next_timer_ms`, `lsp_output`,
`lsp_output_len`; imports `tsrs_host.fs`/`fs_take` and WASI preview1). The import list is identical to the stock
single-thread module and to prototype 04's batch module.

## Build

S is the scratch directory
(`/tmp/claude-1000/-home-maxwellbrown--t3-worktrees-website-t3-ea6468bd-bd0da0eca35fa438/15abd0d2-80d4-4350-954f-da9d9d9fa38c/scratchpad`),
P is this folder, A is `../../artifacts`.

```sh
# 1. effect-tsgo + patched tsrs exactly as prototype 04 (README there, steps 1 and 2). Here it was a copy:
rsync -a --exclude '/target' --exclude '/target-*' $S/exp-effect/effect-tsgo/ $S/exp-effect-lsp/effect-tsgo/
cd $S/exp-effect-lsp/effect-tsgo

# 2. the single-thread patch on the Effect tsrs, and the new crate
git -C tsrs apply $P/tsrs-single-thread-lsp-on-effect.patch
git apply $P/effect-tsgo-ets_wasm_lsp.patch

# 3. fast development module (about 70 s, 30 MB)
CARGO_TARGET_DIR=$PWD/target-wasm CARGO_PROFILE_RELEASE_LTO=off CARGO_PROFILE_RELEASE_CODEGEN_UNITS=16 \
  CARGO_PROFILE_RELEASE_PANIC=abort CARGO_PROFILE_RELEASE_STRIP=none \
  $S/rust/rs cargo build --release -p ets_wasm_lsp --target wasm32-wasip1

# 4. release module (about 3.5 min): writes $A/tsrs-effect-lsp-single.wasm and .raw.wasm, checks the imports
CARGO_TARGET_DIR=$PWD/target-wasm-opt $S/rust/rs bash $P/scripts/build-wasm.sh $A/tsrs-effect-lsp-single.wasm

# 5. native reference from the same tree (dev profile is opt-level 3): target/debug/tsrs
$S/rust/rs cargo build -p ets_tsrs --features cli

# 6. native tests
$S/rust/rs cargo test -p ets_effecttest --no-fail-fast   # needs internal/bundledeffect/testfixtures.tar.gz, below
(cd tsrs && CARGO_TARGET_DIR=$PWD/../target-tsrs $S/rust/rs cargo test -p tsrs_lsp -p tsrs_project --no-fail-fast)
```

The Effect test suite embeds `internal/bundledeffect/testfixtures.tar.gz`, which is generated, not committed. I made it
with `nix shell nixpkgs#pnpm -c pnpm install --frozen-lockfile --ignore-scripts` at the effect-tsgo root (the pnpm
store went to `/tmp/.pnpm-store`), then a three-line script in `_tools/repoctl` that runs repoctl's own
`ensureEffectFixtures(<root>)` from `src/fixtures.ts`.

## Run

```sh
cd $P
NB=$S/exp-effect-lsp/effect-tsgo/target/debug/tsrs
# feature probe; --inlays sets the plugin option inlays: true, --severity sets diagnosticSeverity overrides,
# --skiplib adds skipLibCheck: true
node run-node.mjs features $A/tsrs-effect-lsp-single.wasm $S/exp --inlays --out /tmp/w.json
node run-node.mjs features --native $NB $S/exp --inlays --out /tmp/n.json
node compare.mjs /tmp/n.json /tmp/w.json
# timed session (also --noplugin, --skiplib, --edits 300, --timers)
node run-node.mjs session $A/tsrs-effect-lsp-single.wasm $S/exp --edits 50
REPEATS=3 bash scripts/node-matrix.sh $S /tmp/matrix && node scripts/summarize-matrix.mjs /tmp/matrix
# nesting limits and crash recovery (--noplugin, --shapes nestedGen,flatMap, --depths 150,175,200)
node run-node.mjs deep $A/tsrs-effect-lsp-single.wasm $S/exp
# browsers (no cross-origin isolation); modes session,features,deep
FIREFOX_PATH=~/.cache/ms-playwright/firefox-1532/firefox/firefox PW_LD_LIBRARY_PATH=$(cat $S/exp-pump/ldpath.txt) \
  WEBKIT_PATH=$S/exp-pump/webkit2359-run.sh node browser/run-browser.mjs $S/exp --browsers chromium,firefox,webkit
node compare.mjs /tmp/n.json $A/05-results-chromium-features.json
```

`$S/exp` must contain `node_modules/effect` (4.1.5). The browser feature probe uses the bridge tsconfig without
`inlays`, so compare it with a native dump made without `--inlays`.

## The recovering host

`startRecoveringServer(module, options)` has the same interface as the pump (async `send`/`tick`). It records the
`initialize` params, `initialized`, and every open document's version and text (applying `didChange` edits itself).
When a call traps (`WebAssembly.RuntimeError`, `RangeError: Maximum call stack size exceeded`, `InternalError: too
much recursion`, `proc_exit`), it instantiates the same compiled module against the same in-memory file system,
replays initialize, initialized and one `didOpen` per open document, and answers the trapping request with a
`RequestFailed` (-32803) error. A document whose `didOpen`/`didChange` trapped is quarantined before the rebuild (those
messages only parse, so its text would trap the replay too); a document that crashes the server twice at the same
version is quarantined as well, and if a replay still traps, the named document is quarantined and the rebuild
retried (up to 3 times). Requests for a quarantined document get an error without reaching the server, and its next `didChange` lifts
the quarantine. `server.recoveries` lists each restart with its timings.
