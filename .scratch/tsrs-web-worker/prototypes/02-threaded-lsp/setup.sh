#!/usr/bin/env bash
# Recreates the experiment layout under $S/exp-threads (S = the session scratch dir that holds rust/, src/tsrs, exp/):
#   $S/exp-threads/tsrs   patched copy of tsrs e083fd7 (tsrs-wasm-threads.patch + build-threads.sh)
#   $S/exp-threads/host   this prototype directory (hosts, driver, browser harness)
#   $S/exp-threads/ws     the test workspace: tsconfig.json, main.ts, node_modules/effect (.d.ts files + package.json)
#   $S/exp-threads/ffld.txt, webkit-nix.log   NixOS library paths for the Playwright Firefox / nixpkgs WebKit runs
# Usage: S=<scratch dir> ./setup.sh
set -euo pipefail
: "${S:?set S to the scratch directory}"
HERE=$(cd "$(dirname "$0")" && pwd)
E=$S/exp-threads
mkdir -p "$E"
if [ ! -d "$E/tsrs" ]; then
  cp -r "$S/src/tsrs" "$E/tsrs"
  git -C "$E/tsrs" apply "$HERE/tsrs-wasm-threads.patch"
fi
cp "$HERE/build-threads.sh" "$E/tsrs/"
mkdir -p "$E/host/browser"
cp "$HERE"/*.js "$HERE"/*.mjs "$HERE"/main.ts "$E/host/"
cp "$HERE"/browser/* "$E/host/browser/"
cp "$HERE/measure.sh" "$E/"
mkdir -p "$E/ws/node_modules/effect"
cp "$HERE/workspace/tsconfig.json" "$HERE/workspace/main.ts" "$E/ws/"
(cd "$S/exp/node_modules/effect" && cp package.json "$E/ws/node_modules/effect/" && find dist -name '*.d.ts' | cpio -pdm "$E/ws/node_modules/effect" 2>/dev/null)
# Firefox (Playwright's cached firefox-1532) needs GTK and X libraries; WebKit comes from nixpkgs' playwright-driver.
nix build --no-link --print-out-paths nixpkgs#gtk3.out nixpkgs#glib.out nixpkgs#pango.out nixpkgs#cairo.out \
  nixpkgs#gdk-pixbuf.out nixpkgs#atk.out nixpkgs#xorg.libX11.out nixpkgs#xorg.libXcomposite.out nixpkgs#xorg.libXdamage.out \
  nixpkgs#xorg.libXext.out nixpkgs#xorg.libXfixes.out nixpkgs#xorg.libXrandr.out nixpkgs#xorg.libxcb.out nixpkgs#alsa-lib.out \
  nixpkgs#dbus-glib.out nixpkgs#dbus.lib nixpkgs#xorg.libXtst.out nixpkgs#xorg.libXi.out nixpkgs#xorg.libXrender.out \
  nixpkgs#xorg.libXcursor.out nixpkgs#fontconfig.lib nixpkgs#freetype.out nixpkgs#harfbuzz.out nixpkgs#libxkbcommon.out \
  nixpkgs#stdenv.cc.cc.lib nixpkgs#zlib.out nixpkgs#libGL nixpkgs#mesa nixpkgs#pciutils nixpkgs#libdrm.out nixpkgs#expat.out \
  | sed 's#$#/lib#' | tr '\n' ':' > "$E/ffld.txt"
nix build --no-link --print-out-paths --impure --expr 'let p = import (builtins.getFlake "nixpkgs") { system = "x86_64-linux"; };
  in p.playwright-driver.browsers.override { withChromium = false; withFirefox = false; withChromiumHeadlessShell = false; withFfmpeg = false; }' \
  > "$E/webkit-nix.log"
echo "layout ready in $E"
