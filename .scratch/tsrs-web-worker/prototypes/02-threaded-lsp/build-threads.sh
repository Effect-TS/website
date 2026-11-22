#!/usr/bin/env bash
# Release build of tsrs (full CLI, used as `tsrs --lsp --stdio`) for wasm32-wasip1-threads.
set -euo pipefail
cd "$(dirname "$0")"
PANIC=${PANIC:-abort}
CARGO_PROFILE_RELEASE_OPT_LEVEL=${OPT:-s} \
CARGO_PROFILE_RELEASE_LTO=fat \
CARGO_PROFILE_RELEASE_CODEGEN_UNITS=1 \
CARGO_PROFILE_RELEASE_PANIC=$PANIC \
CARGO_PROFILE_RELEASE_STRIP=debuginfo \
CARGO_TARGET_WASM32_WASIP1_THREADS_RUSTFLAGS="-C link-arg=--max-memory=4294967296 -C link-arg=-zstack-size=8388608 --cfg tsrs_wasm_threads ${EXTRA_RUSTFLAGS:-}" \
  cargo build --release -p tsrs_cli --target wasm32-wasip1-threads --locked
