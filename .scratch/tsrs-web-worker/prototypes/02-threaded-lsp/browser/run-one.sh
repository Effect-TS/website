#!/usr/bin/env bash
# run-one.sh <chromium|firefox|webkit> <url|blank>: one harness run with the NixOS workarounds of measure-browsers.sh.
cd "$(dirname "$0")/.."
B=$1; URL=$2
REPO=${REPO:-/home/maxwellbrown/.t3/worktrees/website/t3-ea6468bd-bd0da0eca35fa438}
SCRATCH=$(cd .. && pwd)
case $B in
  chromium) PLAYWRIGHT_FROM=$REPO/package.json node browser/run-playwright.mjs chromium "$URL" ;;
  firefox) LD_LIBRARY_PATH=$(cat "$SCRATCH/ffld.txt") BROWSER_PATH=$HOME/.cache/ms-playwright/firefox-1532/firefox/firefox \
    PLAYWRIGHT_FROM=$REPO/package.json node browser/run-playwright.mjs firefox "$URL" ;;
  webkit) M=$(nix build --no-link --print-out-paths nixpkgs#mesa 2>/dev/null | head -1)
    LIBGL_ALWAYS_SOFTWARE=1 __EGL_VENDOR_LIBRARY_FILENAMES=$M/share/glvnd/egl_vendor.d/50_mesa.json \
    PLAYWRIGHT_MODULE=$(nix build --no-link --print-out-paths nixpkgs#playwright-driver 2>/dev/null | head -1) \
    BROWSER_PATH=$(tail -1 "$SCRATCH/webkit-nix.log")/webkit-2272/pw_run.sh node browser/run-playwright.mjs webkit "$URL" ;;
esac
