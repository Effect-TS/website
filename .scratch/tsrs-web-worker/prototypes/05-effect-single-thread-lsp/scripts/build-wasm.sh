#!/usr/bin/env bash
# Builds crates/ets_wasm_lsp (the Effect-patched single-threaded language server module) with tsrs's tools/wasm/build.sh release settings.
# Run inside the toolchain wrapper from the effect-tsgo checkout root:  <S>/rust/rs bash build-wasm.sh <out.wasm>
#   OPT=s (default): opt-level s + -inlinehint-threshold=150, wasm-opt -Os.  WASM_OPT=none skips wasm-opt.
set -euo pipefail
OUT=${1:?usage: build-wasm.sh <out.wasm>}
ROOT=$PWD
SYSROOT=$(rustc --print sysroot)
TARGET_DIR=${CARGO_TARGET_DIR:-$ROOT/target}
flags="--remap-path-prefix=$ROOT=/effect-tsgo --remap-path-prefix=$CARGO_HOME/registry/src=/cargo --remap-path-prefix=$SYSROOT/lib/rustlib/src/rust=/rustc -C llvm-args=-inlinehint-threshold=150"
CARGO_PROFILE_RELEASE_OPT_LEVEL=s \
  CARGO_PROFILE_RELEASE_LTO=fat \
  CARGO_PROFILE_RELEASE_CODEGEN_UNITS=1 \
  CARGO_PROFILE_RELEASE_PANIC=abort \
  CARGO_PROFILE_RELEASE_DEBUG=false \
  CARGO_PROFILE_RELEASE_STRIP=debuginfo \
  CARGO_TARGET_WASM32_WASIP1_RUSTFLAGS="$flags" \
  cargo build --release -p ets_wasm_lsp --target wasm32-wasip1
RAW="$TARGET_DIR/wasm32-wasip1/release/ets_wasm_lsp.wasm"
if [ "${WASM_OPT:-}" = none ]; then cp "$RAW" "$OUT"; exit 0; fi
features=$(node -e '
  const m = new WebAssembly.Module(require("fs").readFileSync(process.argv[1]));
  const s = WebAssembly.Module.customSections(m, "target_features")[0];
  const out = [];
  if (s) {
    const b = new Uint8Array(s); let i = 0;
    const leb = () => { let r = 0, sh = 0, x; do { x = b[i++]; r |= (x & 127) << sh; sh += 7; } while (x & 128); return r; };
    const n = leb();
    for (let k = 0; k < n; k++) { const prefix = String.fromCharCode(b[i++]); const len = leb(); const name = new TextDecoder().decode(b.subarray(i, i + len)); i += len; if (prefix === "+") out.push("--enable-" + (name === "nontrapping-fptoint" ? "nontrapping-float-to-int" : name)); }
  }
  console.log(out.join(" "));' "$RAW")
# shellcheck disable=SC2086
wasm-opt $features -Os --strip-debug --strip-producers "$RAW" -o "$OUT"
cp "$RAW" "${OUT%.wasm}.raw.wasm"
node -e '
  const m = new WebAssembly.Module(require("fs").readFileSync(process.argv[1]));
  const imp = WebAssembly.Module.imports(m);
  for (const i of imp) if (!(i.module === "tsrs_host" && (i.name === "fs" || i.name === "fs_take")) && i.module !== "wasi_snapshot_preview1") { console.error("unexpected import " + i.module + "." + i.name); process.exitCode = 1 }
  if (imp.some((i) => i.name === "thread-spawn")) { console.error("thread-spawn import"); process.exitCode = 1 }
  console.log("imports: " + imp.map((i) => i.name).join(" "))' "$OUT"
