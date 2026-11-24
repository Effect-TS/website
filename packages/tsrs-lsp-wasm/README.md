# @website/tsrs-lsp-wasm

The Effect-patched tsrs language server built as one single-threaded `wasm32-wasip1` module, plus the TypeScript host
that runs it in a browser module Worker or in Node. The server gives the same Effect diagnostics, quick fixes,
refactors, hover and completions as the server-hosted `tsrs --lsp --stdio` the Scratchpad uses today. It needs no
threads, no SharedArrayBuffer and no cross-origin isolation.

Neither tsrs nor Effect ships this build. tsrs has no single-threaded pump, and Effect-TS/tsgo has no wasm language
server crate. Until they do, this package carries both changes and builds the module from pinned upstream commits.
Nothing here changes either upstream repository.

## What is in the package

- `upstream/pins.json` pins Effect-TS/tsgo and oxc-project/tsrs by full commit SHA, and the Rust toolchain and target.
- `upstream/patches/tsrs/0001-single-thread-lsp-pump.patch` is the pump. It applies to tsrs after Effect's own tsrs
  patches.
- `upstream/patches/effect-tsgo/0001-cargo-lock.patch` updates effect-tsgo's `Cargo.lock`. It syncs the tsrs crate
  versions, which is what Effect's `repoctl submodules setup` does, and adds the new crate's entry.
- `upstream/crates/ets_wasm_lsp/` is the module crate. The build copies it into the effect-tsgo checkout.
- `scripts/build-wasm.ts` builds `dist/tsrs-effect-lsp.wasm`.
- `scripts/types-pack.ts` collects packages' declaration files into a types pack for the tests. The Scratchpad
  ships no pack: its Container collects one from the installed packages after each install (ADR 0004).
- `src/` is the runtime host. It uses no Node built-ins and no dependencies.
- `dist/manifest.json` records sizes, sha256 sums, the upstream SHAs and the build mode. Nothing in `dist/` is
  committed.

## Prerequisites

The repo's flake has everything. `nix develop` gives Rust 1.100.0 with the `wasm32-wasip1` target through
rust-overlay, binaryen's `wasm-opt`, a C compiler for Cargo build scripts, git and Node.

Without Nix, install these yourself.

```sh
rustup toolchain install 1.100.0 --profile minimal --target wasm32-wasip1
# binaryen for wasm-opt (release builds only), e.g. `brew install binaryen` or your distro's package
# a C compiler on PATH as `cc`, git, Node 24
```

The build script sets `RUSTUP_TOOLCHAIN` from the pin file, so rustup picks 1.100.0 even when another toolchain is
the default. It stops with a message naming the missing piece if a tool, the right rustc version or the target's
standard library is not there. The first build needs network access for the two git fetches and for crates.io.

## Building

```sh
nix develop -c pnpm --filter @website/tsrs-lsp-wasm build:wasm        # release, about 4 min from a clean cache
nix develop -c pnpm --filter @website/tsrs-lsp-wasm build:wasm:dev    # no LTO, no wasm-opt, about 2.5 min
nix develop -c pnpm --filter @website/tsrs-lsp-wasm build             # same as build:wasm
```

Pass `--force` to `scripts/build-wasm.ts` to rebuild anyway. The release settings are tsrs's `tools/wasm/build.sh`
settings: opt-level `s`, `-inlinehint-threshold=150`, fat LTO, one codegen unit, `panic=abort`, then
`wasm-opt -Os --strip-debug --strip-producers`. The dev build keeps opt-level 3 and uses 16 codegen units. Both
write `dist/tsrs-effect-lsp.wasm`, and the manifest's `wasm.mode` says which one is there.

What the build does:

1. It checks the tools.
2. It hashes `upstream/`, the pins, the build script, the mode and the tool versions. If the hash and the output's
   sha256 match the manifest, it stops there. An unchanged rerun takes well under a second plus the Nix shell start.
3. It fetches each pinned commit shallowly into a bare repository under `.cache/git`. Nothing uses submodules.
4. It builds the source tree under `.cache/work/effect-tsgo`, the way Effect's repoctl does it. It checks out
   effect-tsgo, checks that `_packages/tsgo/upstream.json` names our tsrs pin as `tags.tsrs.latest`, checks tsrs out
   at `tsrs/`, and applies `_patches/tsrs/*.patch` with `git apply` in bytewise filename order. A
   `_patches/tsrs-<sha>` override folder wins if one exists for the pinned commit. It commits those patches inside
   `tsrs/`, then applies ours on top. It copies the crate and applies the lock patch. No Go, pnpm or repoctl is
   needed. A stamp skips this step while `upstream/` and the pins stay the same.
5. It runs `cargo build --release --locked -p ets_wasm_lsp --target wasm32-wasip1` with `CARGO_HOME`, the target
   directory and `TMPDIR` inside `.cache`.
6. It runs `wasm-opt` in release mode, with the feature flags read from the module's `target_features` section.
7. It verifies the module. The only imports may be `tsrs_host.fs`, `tsrs_host.fs_take` and
   `wasi_snapshot_preview1.*`. There may be no `thread-spawn` and no imported memory. The exports must include the
   pump ABI, and the initial memory must hold the 80 MiB stack from `build.rs`, at least 1280 pages.
8. It writes the module, `dist/licenses/` and the manifest's `wasm` entry.

The script writes only to `.cache/` and `dist/` in this package. Delete `.cache/` to start over.

## Using it from a Vite app

The package exports `./dist/*`, so a worker can import the artifacts as URLs once they are built.

```ts
import { startLspHost } from "@website/tsrs-lsp-wasm"
import wasmUrl from "@website/tsrs-lsp-wasm/dist/tsrs-effect-lsp.wasm?url"

const host = await startLspHost({
  module: fetch(wasmUrl), // compileStreaming when served as application/wasm
  typesPacks: [packBytes], // a TSPK types pack, e.g. from encodeTypesPack
  files: { "src/main.ts": mainText, "src/greeter.ts": greeterText },
  onMessage: (json) => postMessage(json),
})
self.onmessage = (event) => void host.send(event.data)
```

The Scratchpad does this in `apps/web/src/features/scratchpad/lsp.worker.ts`, with the module URL coming from
`virtual:tsrs-lsp-assets` (`tsrs-lsp-assets-plugin.ts`), which also copies `dist/licenses/` into the build and stops
`astro build` with the build command when the files are missing. `pnpm run setup:scratchpad` at the repo root (inside
`nix develop`) builds everything. The app needs the files built before `astro dev` or `astro build`. Over the network the module is about 3.0 MB
brotli. The manifest has exact numbers. The Scratchpad starts the host with no types pack and `tsconfig: null`: the
Workspace's own `tsconfig.json` is mirrored in, and the Container's installed declarations arrive later as a pack
(ADR 0004).

## Runtime API

All of it is exported from `src/index.ts`.

- `startLspHost(options)` is the entry point for a Worker. Options are `module`, `onMessage`, `files`, `fs`,
  `typesPacks`, `rootPath` (default `/workspace`), `tsconfig` (default `WORKSPACE_TSCONFIG`, written only if
  `<root>/tsconfig.json` is missing), `onRecovery`, `onStderr`, `onError`, `scheduler`, `maxRestartAttempts`,
  `forwardServerRequests` and `watchFileSystem`. The host it returns has `send(json)`, `fs`, `idle()`,
  `runBackgroundWork()`, `recoveries`, `quarantined`, `memoryBytes()`, `disposed` and `dispose()`.
- `compileLspModule(source)` takes a `WebAssembly.Module`, bytes or a `Response`. Compile once to start several hosts.
- `MemoryFileSystem` is the workspace. It has `writeFile`, `appendFile`, `mkdir`, `remove`, `rename`, `readFile`,
  `readTextFile`, `readDirectory`, `stat`, `exists`, `listFiles` and `watch`.
- `encodeTypesPack`, `decodeTypesPack` and `mountTypesPack` read and write the pack format.
- `startRecoveringServer` and `instantiateLspInstance` are the lower layers, for callers that want to drive ticks
  themselves.
- `ManualScheduler` runs scheduled ticks by hand in tests. `timeoutScheduler` is the default.
- `WORKSPACE_ROOT_PATH`, `WORKSPACE_ROOT_URI`, `WORKSPACE_TSCONFIG`, `workspacePath`, `workspaceUri`,
  `pathToFileUri` and `fileUriToPath` hold the path conventions. The Scratchpad's root URI `file:///workspace` maps
  to `/workspace`, and `src/main.ts` to `/workspace/src/main.ts`.

How the host behaves, which matters to a client:

- Diagnostics come only from pulls (`textDocument/diagnostic`). The server pushes nothing for files, the same as
  native tsrs. Pull again after a `didChange` and after any file-system change.
- Files that change only in `host.fs` reach the server as `workspace/didChangeWatchedFiles`, which the host sends
  before the next queued message. The server has no file watcher of its own. Without the notification it keeps
  serving the old contents. The test suite checks this. It applies whether or not the client advertises
  `didChangeWatchedFiles.dynamicRegistration`. Changes made before `initialized` are not sent, since the project
  load reads the files anyway.
- The host schedules `lsp_tick` itself. When the server reports queued background work, a tick runs at delay 0
  after the messages already waiting. Server timers, mainly the 30 s idle cache clean, get a timer at
  `lsp_next_timer_ms`.
- The host answers `client/registerCapability`, `client/unregisterCapability` and `window/workDoneProgress/create`
  with `null` and does not forward them. The server never waits for those replies.
- `send` rejects after `dispose()` or after a fatal error. Catch it if you do not await it.

## Module ABI and host contract

Exports, from `upstream/crates/ets_wasm_lsp/src/lib.rs`:

| export                                    | meaning                                                                                           |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `lsp_input(len) -> ptr`                   | a buffer for the next call's argument                                                             |
| `lsp_init(flags) -> 0`                    | creates the server, with the cwd in the input buffer. Flag 1 means a case-insensitive file system |
| `lsp_message() -> status`                 | handles one JSON-RPC message without a Content-Length header, including a request's work          |
| `lsp_tick() -> status`                    | runs queued background tasks and due timers                                                       |
| `lsp_next_timer_ms() -> i64`              | milliseconds to the next timer, or -1                                                             |
| `lsp_output() -> ptr`, `lsp_output_len()` | outgoing messages since the last call, each followed by `\n`                                      |

Status 0 is idle, 3 means background work is queued, 1 means the server exited, 2 is a fatal read error.

Imports are `tsrs_host.fs(op, ptr, len)` and `tsrs_host.fs_take(ptr)`, the protocol of tsrs's
`crates/tsrs_wasm/src/host.rs`, plus WASI preview1. The host implements the clocks, `random_get`, `fd_write` for
stdout and stderr, `environ_*`, `proc_exit` and a few stubs. Everything else returns `ENOSYS`. The module never
touches a WASI file system. All file access goes through `tsrs_host.fs`.

A host must call `lsp_tick` when the status is 3, call it again after `lsp_next_timer_ms`, and answer or drop
server-to-client requests. It must treat any trap as the end of the instance.

## Known limits

- Deep nesting overflows the JS engine's native stack and kills the instance. Node handles about 180 nested
  `Effect.gen` blocks, Chromium about 95, and bracket nesting fails in the parser at 500 to 1500 depending on the
  engine. The host restarts from the compiled module in about half a second, replays `initialize` and the open
  documents, and quarantines the document that caused the crash until its text changes. Requests for it get a
  `-32803` error.
- Requests cannot be cancelled. Each message runs to completion before the next one, and `$/cancelRequest` arrives
  too late to matter.
- `panic=abort`. wasm32-wasip1 cannot unwind, so a panic is a trap, and Effect's three `recover` boundaries in its
  type parser abort instead of returning "no type". The host recovers from these the same way.
- A restart loses the checker and auto-import caches, so the next completion is slower.
- There is no project-loading progress, and debounces collapse into the next tick.

## Bumping the pins and refreshing the patches

1. Pick an Effect-TS/tsgo commit and read its `_packages/tsgo/upstream.json`. Set `effectTsgo.commit` and set
   `tsrs.commit` and `tsrs.version` to the `gitHead` of `tags.tsrs.latest`. The build refuses a mismatch. Update
   `rust.toolchain` if effect-tsgo's `rust-toolchain.toml` moved, and update the version in `flake.nix` with it.
2. Run the build. If our tsrs patch no longer applies, `git apply` reports the failing hunks. Fix them in
   `.cache/work/effect-tsgo/tsrs`, where Effect's patches are already committed, so `git -C
.cache/work/effect-tsgo/tsrs diff` shows only our change. Write that diff over the patch file and keep the text
   above the first `diff --git` line.
3. Regenerate the lock patch with `nix develop -c node scripts/build-wasm.ts --refresh-lock-patch`. It lets cargo
   update the lock, checks that the only changes are tsrs version lines and the new crate's entry, and writes the
   patch.
4. Rebuild with `--force`, run the tests, and compare the manifest sizes with the old ones.

## Licenses

tsrs is Apache-2.0 and ships a NOTICE file. It also contains TypeScript's `lib.*.d.ts` files and code ported from
Go. Effect-TS/tsgo is MIT. The build copies tsrs's `LICENSE`, `NOTICE` and `licenses/Go-LICENSE` and effect-tsgo's
`LICENSE` into `dist/licenses/` next to the module, with a short README saying what was changed. Ship that folder
wherever the module is served from. The patch header and the crate's source header state that they modify tsrs. The
crate is marked Apache-2.0 because it derives from tsrs's `tsrs_wasm_lsp`. The module also links crates.io crates
under MIT or Apache-2.0, listed in the checkout's `Cargo.lock`.

## Tests

`vp test --project @website/tsrs-lsp-wasm` runs unit tests for the file system, the pack format, the workspace
defaults and the scheduler. It also runs an integration test that loads `dist/tsrs-effect-lsp.wasm` in Node and drives
a real session. That covers Effect 377001 and TS2322 with their ranges, hover, completion, an edit that clears a
diagnostic, changes made only in the virtual file system, and crash recovery. Without a built module the
integration test is skipped with a banner saying how to build it.
