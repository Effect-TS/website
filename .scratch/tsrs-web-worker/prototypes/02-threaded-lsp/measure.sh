#!/usr/bin/env bash
# Runs the LSP session against native tsrs, wasmtime and the Node host; prints the key lines.
cd "$(dirname "$0")/host"
WASM=${WASM:-../tsrs/target/wasm32-wasip1-threads/release/tsrs.wasm}
WT=${WT:-$(nix shell nixpkgs#wasmtime -c which wasmtime)}
keys='initialize|first diagnostics|process start|hover \(now\)|hover \(program\)|completion|definition|median|final sample|shutdown|FAILED|exited'
run() { echo "== $1"; shift; timeout 300 node lsp-drive.mjs --quiet --edits 20 "$@" 2>&1 | grep -E "$keys" | cut -c1-170; }
for i in 1 2 3; do
  run "native #$i" --root "$PWD/../ws" -- ../tsrs/target-native/release/tsrs --lsp --stdio
  run "wasmtime P=4 #$i" --root /ws -- $WT run -S threads -W threads,shared-memory --env TSRS_WASM_PARALLELISM=4 --dir ../ws::/ws $WASM --lsp --stdio
  for P in 1 4 8; do
    run "node-host P=$P #$i" --root /ws --usr2 -- node node-host.mjs --pool 48 --env TSRS_WASM_PARALLELISM=$P --mount ../ws:/ws $WASM --lsp --stdio
  done
done
