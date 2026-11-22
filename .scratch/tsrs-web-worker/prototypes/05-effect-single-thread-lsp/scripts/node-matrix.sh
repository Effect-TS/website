#!/usr/bin/env bash
# Runs the timed session (50 edits) for every runtime/tsconfig combination, REPEATS times, into $OUT.
#   bash scripts/node-matrix.sh <S> <out dir>      (from the prototype folder)
set -uo pipefail
S=${1:?scratch dir}; OUT=${2:?out dir}; REPEATS=${REPEATS:-3}
A=$(cd ../../artifacts && pwd)
NB=$S/exp-effect-lsp/effect-tsgo/target/debug/tsrs
mkdir -p "$OUT"
run() { # name, runtime args..., tsconfig flags...
  local name=$1; shift
  for r in $(seq 1 "$REPEATS"); do
    node run-node.mjs session "$@" --quiet --edits 50 --out "$OUT/session-$name-$r.json" > /dev/null
  done
  echo "done $name"
}
for cfg in full:"" skiplib:--skiplib noplugin:--noplugin noplugin-skiplib:"--noplugin --skiplib"; do
  n=${cfg%%:*}; f=${cfg#*:}
  # shellcheck disable=SC2086
  run "effect-wasm-$n" "$A/tsrs-effect-lsp-single.wasm" "$S/exp" $f
  # shellcheck disable=SC2086
  run "stock-wasm-$n" "$A/tsrs-lsp-single.wasm" "$S/exp" $f
  # shellcheck disable=SC2086
  run "native-$n" --native "$NB" "$S/exp" $f
done
