#!/usr/bin/env bash
# Runs the browser harness in Chromium, Firefox and WebKit (NixOS workarounds below) against a running serve.mjs.
# Usage: browser/measure-browsers.sh [query-string] [runs]
cd "$(dirname "$0")/.."
Q=${1:-pool=24&parallelism=4}
RUNS=${2:-3}
REPO=${REPO:-/home/maxwellbrown/.t3/worktrees/website/t3-ea6468bd-bd0da0eca35fa438}
URL="http://127.0.0.1:${PORT:-8765}/browser/index.html?$Q"
SCRATCH=$(cd .. && pwd)
for i in $(seq 1 "$RUNS"); do
  echo "=== chromium run $i"
  PLAYWRIGHT_FROM=$REPO/package.json node browser/run-playwright.mjs chromium "$URL"
  # Playwright 1.63 wants firefox-1543, the cache has firefox-1532; it needs GTK libraries from nixpkgs.
  echo "=== firefox run $i"
  LD_LIBRARY_PATH=$(cat "$SCRATCH/ffld.txt") BROWSER_PATH=$HOME/.cache/ms-playwright/firefox-1532/firefox/firefox \
    PLAYWRIGHT_FROM=$REPO/package.json node browser/run-playwright.mjs firefox "$URL"
  # The cached WebKit build lacks ~60 Ubuntu libraries; nixpkgs' playwright-driver 1.59.1 WebKit 26.4 runs with Mesa EGL.
  echo "=== webkit run $i"
  M=$(nix build --no-link --print-out-paths nixpkgs#mesa 2>/dev/null | head -1)
  LIBGL_ALWAYS_SOFTWARE=1 __EGL_VENDOR_LIBRARY_FILENAMES=$M/share/glvnd/egl_vendor.d/50_mesa.json \
    PLAYWRIGHT_MODULE=$(nix build --no-link --print-out-paths nixpkgs#playwright-driver 2>/dev/null | head -1) \
    BROWSER_PATH=$(cat "$SCRATCH/webkit-nix.log" | tail -1)/webkit-2272/pw_run.sh node browser/run-playwright.mjs webkit "$URL"
done

