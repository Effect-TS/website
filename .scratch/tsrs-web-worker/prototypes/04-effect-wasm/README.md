# Prototype 04: Effect-patched batch tsc WASM module

A `wasm32-wasip1` module with the same ABI as `@tsrs/wasm@7.1.0-beta.tsrs4` that also reports the Effect language
service diagnostics (TS377xxx). It runs unchanged under the stock JS host (`core.js`, `node.js`, `browser.js`).
Findings and numbers: `../../research/04-effect-wasm.md`.

## Contents

- `effect-tsgo-ets_wasm.patch`: the change to the effect-tsgo tree. Base: Effect-TS/tsgo `0e87d44` ("chore: update
  upstreams (#1078)"). Adds `crates/ets_wasm` and updates `Cargo.lock` (the tsrs crate versions synced to the checkout,
  which is what `repoctl submodules setup` does, plus the new crate).
- `ets_wasm/`: the same crate as plain files (`Cargo.toml`, `build.rs`, `src/lib.rs`).
- `tsrs-standalone-cargo-lock.patch`: only needed for the control build of the patched tsrs's own `tsrs_wasm`. Base:
  oxc-project/tsrs `fd57202` (7.1.0-beta.tsrs4) with effect-tsgo's `_patches/tsrs/*.patch` applied. Adds the
  `ets_etscore`/`ets_go` entries the patched tsrs workspace needs in its own lock. The Effect module needs no tsrs change
  beyond Effect's own patches.
- `scripts/build-wasm.sh`: builds `ets_wasm` with the settings of tsrs's `tools/wasm/build.sh` (opt-level s,
  `-inlinehint-threshold=150`, fat LTO, one codegen unit, panic abort, `wasm-opt -Os`) and checks the imports.
- `scripts/run.mjs`: Node runner over the stock host (`TSRS_WASM=<module>` selects the module).
- `scripts/browser.mjs`, `scripts/browser-worker.js`: headless Chromium run in a module Web Worker over the stock
  `browser.js`.
- `scripts/size.mjs`: raw, gzip -9 and brotli -q 11 sizes.
- `test-project/`: `main.ts` (five planted Effect issues and one TS2322), `main2.ts` (exit code and directive test),
  the bridge tsconfig and its variants.

## Build

Paths: `S` is the scratchpad
(`/tmp/claude-1000/-home-maxwellbrown--t3-worktrees-website-t3-ea6468bd-bd0da0eca35fa438/15abd0d2-80d4-4350-954f-da9d9d9fa38c/scratchpad`),
`P` is this folder.

```sh
# 1. effect-tsgo checkout plus the patched tsrs at the commit upstream.json pins (tags.tsrs.latest = 7.1.0-beta.tsrs4)
git clone https://github.com/Effect-TS/tsgo effect-tsgo && cd effect-tsgo && git checkout 0e87d44
git init tsrs && git -C tsrs remote add origin https://github.com/oxc-project/tsrs.git
git -C tsrs fetch --depth 1 origin fd57202e5dedb2124c46bbb2c90938c1647b12ea && git -C tsrs checkout FETCH_HEAD
for p in $(ls _patches/tsrs/*.patch | LC_ALL=C sort); do git -C tsrs apply "$PWD/$p"; done

# 2. the prototype crate and lock
git apply $P/effect-tsgo-ets_wasm.patch

# 3. native Effect tsrs (reference)
$S/rust/rs cargo build -p ets_tsrs --features cli --locked        # target/debug/tsrs

# 4. the module (about 2.5 min on 32 cores)
CARGO_TARGET_DIR=$PWD/target-wasm $S/rust/rs bash $P/scripts/build-wasm.sh /path/to/tsrs-effect.wasm
#    FEATURES=lshooks also registers ets_etslshooks (size experiment only)

# 5. optional control: the patched tsrs's own tsrs_wasm, no Effect hooks
git -C tsrs apply $P/tsrs-standalone-cargo-lock.patch
(cd tsrs && OUT=/path/to/tsrs-effectpatched-nohooks.wasm $S/rust/rs bash tools/wasm/build.sh)
```

## Run

```sh
A=<repo>/.scratch/tsrs-web-worker/artifacts
# the test project needs node_modules/effect for the native run; run.mjs reads effect from $S/exp/node_modules
TSRS_WASM=$A/tsrs-effect.wasm node $P/scripts/run.mjs $S/exp $P/test-project 8                       # bridge tsconfig
TSRS_WASM=$A/tsrs-effect.wasm node $P/scripts/run.mjs $S/exp $P/test-project 8 $P/test-project/tsconfig.skiplib.json
node $P/scripts/run.mjs $S/exp $P/test-project 8                                                     # stock module
node $P/scripts/browser.mjs <repo> $S/exp $A/tsrs-effect.wasm $P/test-project 5                      # Chromium worker
node $P/scripts/size.mjs $S/exp/node_modules/@tsrs/wasm/tsrs.wasm $A/tsrs-effect.wasm
```
