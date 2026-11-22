# Experiment 05: the Effect-patched tsrs language server, single-threaded, in one Web Worker

This experiment combines 03 and 04. I applied the single-thread pump patch from experiment 03 to Effect's patched tsrs
tree. Then I built an Effect variant of the `tsrs_wasm_lsp` cdylib that registers all three Effect hook crates before
it creates the server, and ran the whole Effect language service in one Web Worker. The page had no cross-origin
isolation.

It worked, and more easily than I expected. The patch had one trivial conflict. Neither the module nor the native
binary needed a single fix to compile. I ran a feature probe of 74 sub-probes covering diagnostics, Effect quick
fixes, disable comments, refactors, Effect hover, Effect completions, auto-import, inlay hints, document symbols and
every request the Scratchpad sends. Its output is identical to the native Effect-patched server in Node, Chromium,
Firefox and WebKit. With state reused, an edit plus a pull costs 13.9 ms in Node, 15.1 ms in Chromium, 14 ms in WebKit
and 58 ms in Firefox. The Effect pass adds about 2.3 ms per edit over the stock single-thread module. The module is
3.01 MB brotli, 0.36 MB more than the stock single-thread module.

The real limit is the one experiment 03 found, and Effect makes it a little worse. Deep nesting overflows the browser
engine's stack and kills the instance. With the Effect pass on, Chromium survives 95 nested `Effect.gen` blocks and
dies at 100. Without the pass the limit is 110. I implemented crash recovery in the host. It brings the session back
in 0.33 to 0.45 s in Chromium, WebKit and Node, and in 1.45 s in Firefox. After every restart the session answered
correctly.

Prototype files are in `../prototypes/05-effect-single-thread-lsp/`, which has a README with exact commands. Raw
results are in `../artifacts/05-*`.

## What I did

### Trees and patches

I copied `S/exp-effect/effect-tsgo` from experiment 04 to `S/exp-effect-lsp/effect-tsgo`, leaving out its build
directories. That tree is Effect-TS/tsgo `0e87d44` plus prototype 04's patch. Its `tsrs/` holds oxc-project/tsrs
`fd57202` (7.1.0-beta.tsrs4) with the 32 `_patches/tsrs` patches committed as one commit, `a0c4f4c`, and 04's
standalone lock patch on top.

I applied experiment 03's `tsrs-single-thread-lsp.patch`, made against e083fd7, with `git apply --reject`. Every hunk
applied except one:

```
error: patch failed: crates/tsrs_lsp/src/lib.rs:10
error: crates/tsrs_lsp/src/lib.rs: patch does not apply
```

Effect's patch 150 (`150-tsrs-visibility.patch`) puts a block above the `pub use server::{..}` line, which re-exports
tsrs's in-process LSP test client for `ets_fourslash`. The fix was adding `PumpStatus` to that same line by hand. The
`Cargo.lock` hunk applied with a 67-line offset. Effect's patch 017 touches `server.rs`, adding `REFACTOR_REWRITE` to
`supported_code_action_kinds`, and patches 011, 012, 015, 022 and 024 touch `tsrs_ls`. None of them overlap the pump
code, because the pump code lives in the dispatch and queue plumbing and Effect's code lives in the feature handlers.

The rebased patch is `tsrs-single-thread-lsp-on-effect.patch`. It has 14 files, +596 and -8, the same content as 03
minus its lock hunk. I checked that it applies cleanly to a fresh `git archive` of `a0c4f4c`.

The new effect-tsgo crate is `crates/ets_wasm_lsp`. Its `lib.rs` is tsrs's `tsrs_wasm_lsp/src/lib.rs` with 13 added
lines and one changed `#[path]` to tsrs_wasm's `host.rs`. The added lines are a `register_hooks()` function that calls
`ets_etscheckerhooks::init()`, `ets_etsexecutehooks::init()` and `ets_etslshooks::init()` in the order of
`crates/ets_tsrs/src/main.rs`, and the call to it at the top of `Pump::new`. `Cargo.toml` (27 lines) depends on the
three hook crates and on four tsrs crates by path. `build.rs` (17 lines) is the 80 MiB shadow stack copied from
tsrs_wasm_lsp. `effect-tsgo-ets_wasm_lsp.patch` is 244 lines including the 13-line lock entry, against `0e87d44` plus
prototype 04's patch. I checked that it applies too.

### Compile results

There were no compile errors. The development module built in 1 min 11 s, the release module (fat LTO, opt-level s,
`wasm-opt -Os`) in 3 min 24 s, and the native `ets_tsrs --features cli` in 1 min 45 s, all on the first try. The release
module imports exactly the set the stock single-thread module and the 04 batch module import: `tsrs_host.fs`,
`fs_take` and 19 WASI functions. There is no `thread-spawn`. The initial memory is 1498 pages, which includes the
80 MiB stack. I verified the imports and memory with `wasm-objdump` and `WebAssembly.Module.imports`.

### Native-only code in the Effect crates

I grepped every `ets_*` crate the module links, apart from test files and the binary, test, codegen and PGO crates, for
`thread::`, `rayon`, `std::fs`, `std::process`, `std::env`, `Condvar`, `mpsc`, `crossbeam`, `Instant::now`,
`SystemTime` and `spawn`. The hook crates have none of these. The hits are:

- `ets_go/src/panics.rs`, a `thread_local!` depth counter and `std::process::abort` in `install_fatal_hook`. The LS
  path never installs that hook, and the counter works fine on one thread.
- `ets_etsdiagnostics`, a `spawner: None` field. That crate is the CLI diagnostics command and is not linked.
- Three Go `recover` ports in `ets_typeparser`, which call `ets_go::panics::recover`, a `catch_unwind`. They are in
  `get_type_at_location.rs`, `could_be_strict_effect.rs` and `object_literal_contextual_type.rs`. Natively they turn a
  checker panic into "no type" or "could be an Effect". The module is built with `panic=abort`, because
  wasm32-wasip1 cannot unwind, so any such panic aborts the instance instead. This is the one real semantic difference
  between the two builds. I never saw it happen, but my probes did not set out to trigger checker panics.
- `parking_lot::Mutex` in `ets_typeparser` (links, lazy values, barrel reader) and `ets_autoimportstyle`. On one
  thread these are never contended. A reentrant lock would deadlock natively too.

`ets_bundledeffect` (tar, flate2) is not in `cargo tree -p ets_wasm_lsp --target wasm32-wasip1`. Nothing the hooks do
reaches the real file system. They read files through the program's own file system, which here is the host's
in-memory map.

### Native tests

I ran these by hand on the patched tree:

- `cargo test -p ets_effecttest --no-fail-fast` in effect-tsgo. This is Effect's language-service suite: completion,
  hover, inlay hints, quick fixes, refactors and document symbols through `ets_fourslash`, which drives tsrs's
  in-process LSP client and so goes through the patched `server.rs`. It gave 1948 passed, 0 failed, 1 ignored. It
  first failed to compile, with ``couldn't read `crates/ets_bundledeffect/src/../../../internal/bundledeffect/testfixtures.tar.gz` ``,
  because that archive is generated. I made it with `pnpm install --frozen-lockfile --ignore-scripts`, whose store went
  to `/tmp/.pnpm-store`, followed by repoctl's own `ensureEffectFixtures`.
- `cargo test -p tsrs_lsp -p tsrs_project --no-fail-fast` in `tsrs/`. `tsrs_project` passed 147 of 147. `tsrs_lsp`
  passed 65 of 69. The four failures are `server_projectinfo_test::test_initialize_code_action_kinds`, which asserts the
  stock kinds list while Effect's patch 017 adds `refactor.rewrite`, and the three `stack_sanitizer_test` cases, which
  read the missing `ts-ref/tsc/testdata` checkout. The pristine Effect tree, without my patch, fails the same four with
  the same 65 passing. I verified this by running it.

I did not run clippy this time, or the rest of tsrs's suite.

## Feature comparison against native

`features.js` runs one session against both servers. The client has VS Code-like capabilities: code-action literals
and resolve, inlay hints, hierarchical symbols, completion resolve, and pull diagnostics with relatedInformation and
tags. It opens the five workspace files, and `userPreferences` turns on inlay hints and auto-import. The workspace is
effect 4.1.5's `.d.ts` and `package.json` files plus the bridge tsconfig with the plugin entry. The sources are the
Scratchpad's default `main.ts` and `greeter.ts`, 04's `issues.ts` with five planted Effect issues and one TS2322,
03's services, Schema and Layer program as `app.ts`, and a `refactors.ts`. The native side is `target/debug/tsrs
--lsp --stdio` (the dev profile is opt-level 3 here) in a temp directory with the same file set. `compare.mjs` diffs
the normalized dumps.

I ran four configurations in Node against native: the bridge tsconfig, the same with `inlays: true`, the same with
`skipLibCheck: true`, and the same with `diagnosticSeverity` overrides. All 74 probes were identical in every
configuration (73 with the overrides, where one rule is off). I also ran the bridge-tsconfig probe in a Chromium,
Firefox and WebKit worker, and each was identical to native, 74 of 74. I verified all of this by running it.

| feature                                                                                                                                  | native                                                                                                                                                                                                                                                                                                                                      | wasm (Node, Chromium, Firefox, WebKit) |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| TS diagnostics                                                                                                                           | TS2322 on `issues.ts` 43:13 and `app.ts` 6:8, severity 1                                                                                                                                                                                                                                                                                    | identical                              |
| Effect diagnostics                                                                                                                       | 377001, 377008, 377006 (severity 1), 377017, 377012 (4) in `issues.ts`; 377001 in `main.ts`; 377098, 377037, 377124 in `app.ts`; 377100 in `refactors.ts`                                                                                                                                                                                   | identical codes, ranges, messages      |
| severity mapping                                                                                                                         | Effect error 1, warning 2, message 3, suggestion 4 (Hint); TS suggestions 4                                                                                                                                                                                                                                                                 | identical                              |
| relatedInformation                                                                                                                       | 377008 carries "Inside this Effect generator." at 13:38-13:46, only if `textDocument.diagnostic.relatedInformation` is set                                                                                                                                                                                                                  | identical                              |
| tags                                                                                                                                     | none produced by these files                                                                                                                                                                                                                                                                                                                | identical                              |
| push vs pull                                                                                                                             | push only for `tsconfig.json`, empty, 6 times; file diagnostics only by pull                                                                                                                                                                                                                                                                | identical                              |
| quick fixes, 13 diagnostics                                                                                                              | Effect fixes ("Add yield* statement", "Replace yield with yield*", "Add return statement", "Remove the Effect.gen, and keep the body", "Replace with Schema.Finite", "Replace with Effect.provideService", "Replace with Effect.map"), disable-for-line and disable-for-file on every Effect diagnostic, Effect refactors offered alongside | identical titles, kinds, edits         |
| applied fixes, 6                                                                                                                         | each edit gave the expected text; the target diagnostic cleared in all 6 (yield*, yield to yield*, return yield*, `// @effect-diagnostics-next-line tryCatchInEffectGen:off`, `/** @effect-diagnostics unnecessaryEffectGen:off */`, main.ts yield*)                                                                                        | identical edits and resulting text     |
| refactors, 7 points                                                                                                                      | async function: Rewrite to Effect.gen / .fn, with and without failures; Effect.gen: Convert to Effect.fn("genToFn"); type alias: Generate Effect.Schema / Schema.Class / Recursive Structural; pipe: Rewrite as pipe(X, Y, Z, ...), Wrap with Effect.gen; Layer: toggle annotation / lazy const; on a class name or inside a gen: none      | identical                              |
| applied refactors, 3                                                                                                                     | asyncAwaitToGen and effectGenToFn give correct code; "Generate Effect.Schema" leaves 3 TS2304 because it adds no `Schema` import (an Effect refactor behavior)                                                                                                                                                                              | identical                              |
| hover                                                                                                                                    | Effect type parameter block (Success, Failure, Requirements) on Effect values; `(yield*)` hover on `yield*` and on `*`; Layer hover with provider list and mermaid.live graph links                                                                                                                                                         | identical text                         |
| completions                                                                                                                              | `gen(function*(){})`, `fn(...)`, `fnUntraced(...)` snippets after `Effect.`; `Service<MyService, {}>` class snippets after `extends Context.`; `Class<Person>`, `TaggedError<Person>` and others after `extends Schema.`; `@effect-diagnostics` directives after `// @`; Duration units in `Effect.sleep("")`                               | identical items, edits, sort           |
| auto-import, resolve                                                                                                                     | `Strea` / `Schem`: resolve gives "Add import from \"effect\"" with `import { Stream } from "effect";`                                                                                                                                                                                                                                       | identical                              |
| inlay hints                                                                                                                              | with `inlays: true` Effect removes the generator return-type hints (`Generator<Effect<...>>`) on `Effect.gen`: 2 of 31 in refactors.ts, 1 of 17 in app.ts, 1 of 6 in main.ts; without it they stay                                                                                                                                          | identical in both configurations       |
| document symbols                                                                                                                         | Effect adds an "Effect" group with "Layers" (DbLive `<Db, never, never>`) and "Services" (Db, Clock), plus `Effect.gen() callback` children                                                                                                                                                                                                 | identical                              |
| definition, declaration, typeDefinition, implementation, references, prepareRename, rename, documentHighlight, signatureHelp, formatting | the Scratchpad's request set; declaration returns an error response on both                                                                                                                                                                                                                                                                 | identical                              |

I found no difference. Two things showed up that hold on native too, so they are not wasm issues. First, the
Scratchpad's CodeMirror client sets no `textDocument.diagnostic` capabilities, so the bridge's pulls get no
relatedInformation today. Second, CodeMirror's lsp-client 6.3.1 sends neither `textDocument/codeAction`,
`textDocument/inlayHint`, `documentSymbol` nor `completionItem/resolve`. I checked its `dist/index.js`. The Effect
quick fixes, refactors and inlay hints work in the module, but the Scratchpad cannot reach them until the client asks
for them.

## Numbers

### Node

Node 24.22.3, release module, same machine as 03 (32 cores), nothing else running. The session uses CodeMirror's
capabilities, opens 5 files, makes 50 edits to `app.ts` with a pull and a hover after each, and repeats 3 times. I
report medians. Native timings are request to response over pipes. Native notifications have no reply, so the
adapter waits 30 ms of quiet after each one, which makes native open and edit times unusable. For native I give
pull times only.

| measure                                      | Effect wasm, bridge tsconfig | Effect wasm, skipLibCheck | Effect wasm, no plugin entry | stock 03 module  | native Effect tsrs |
| -------------------------------------------- | ---------------------------- | ------------------------- | ---------------------------- | ---------------- | ------------------ |
| compile / instantiate                        | 57-70 / 20-31 ms             | same                      | same                         |                  |                    |
| didOpen of first file (project load)         | 568 ms                       | 631 ms                    | 568 ms                       | 579 ms           | async              |
| first pull, main.ts                          | 118 ms                       | 119 ms                    | 64 ms                        | 62 ms            | 12.8 ms            |
| time to first diagnostics (opens + pull)     | 696 ms                       | 761 ms                    | 643 ms                       | 655 ms           | not comparable     |
| first pulls, all 5 files                     | 177 ms                       | 177 ms                    | 100 ms                       | 99 ms            | 34 ms              |
| first edit, didChange + pull                 | 25.8 ms                      | 26.8 ms                   | 19.0 ms                      | 22.1 ms          |                    |
| background after first edit                  | 341 ms                       | 333 ms                    | 355 ms                       | 356 ms           | other threads      |
| per edit, median (p90)                       | 13.9 (18.5) ms               | 13.6 (18.1) ms            | 11.8 (14.8) ms               | 11.6 (14.7) ms   | pull 37.7 ms       |
| hover after edit, median                     | 2.0 ms                       | 2.0 ms                    | 1.8 ms                       | 1.7 ms           | 5.7 ms             |
| Effect hover, cold / repeat                  | 34.6 / 0.4 ms                | 37.3 ms                   | 30.8 ms                      | 29.5 ms          | 8.1 / 1.0 ms       |
| completion `Effect.`, cold / repeat          | 20.9 / 4.0 ms                | 21.1 ms                   | 12.4 ms                      | 13.0 ms          | 5.2 / 3.4 ms       |
| codeAction on floating Effect, cold / repeat | 12.9 / 0.8 ms                | 13.0 ms                   | 3.4 ms                       | 3.2 ms           | 2.4 / 1.3 ms       |
| memory after init / open / 50 edits          | 93 / 205 / 253.6 MiB         | same                      | 93 / 205 / 253.1             | 93 / 205 / 252.9 | RSS 99 / 255       |

The feature probe's medians, over repeated calls on warm state, in ms:

| request                    | native | Node | Chromium | Firefox | WebKit |
| -------------------------- | ------ | ---- | -------- | ------- | ------ |
| first pull per file        | 5.3    | 18   | 24.6     | 16      | 12     |
| codeAction (18 calls)      | 2.4    | 2.9  | 4        | 5       | 4      |
| refactor codeAction (7)    | 1.7    | 1.0  | 0.9      | 3       | 0      |
| hover (12)                 | 1.9    | 1.1  | 0.9      | 2       | 1      |
| completion (8)             | 16.7   | 7.8  | 9.7      | 22      | 6      |
| completionItem/resolve (8) | 2.9    | 1.2  | 1.0      | 3       | 1      |
| inlayHint (3 files)        | 19.1   | 8.3  | 13.3     | 37      | 8      |
| documentSymbol (2)         | 6.6    | 5.3  | 5        | 10      | 4      |

The Effect pass costs about 2.3 ms per edit (13.9 against 11.6 to 11.8) once state is reused. That is about 20%.
Experiment 03 measured 14.7 ms for stock on its own one-file session, and the stock module measures 11.6 ms on this
session. Cold Effect work costs more. The first pull of a file costs about 55 ms more, the first completion about
8 ms more and the first code action about 10 ms more, because the Effect type parser and rule caches start empty.
Repeats are as cheap as stock.

`skipLibCheck` makes no difference in the language server. Edit medians were 13.9 and 13.6 ms, and the first pulls
were the same. A pull checks only the requested file, so effect's `.d.ts` files are never checked either way. The 3x
gain experiment 04 saw belongs to batch `tsc`, which checks every file. For the Scratchpad, adding `skipLibCheck` to
the bridge tsconfig buys nothing on this path.

The native pull median (37.7 ms) is slower than wasm's 13.9 ms. Experiment 03 saw the same direction, 22 ms against
14.7 ms. I did not investigate. The native binary is a dev-profile build with threads, so this comparison says
little about native speed.

Memory and leaks. I ran 300 edits. Linear memory read 253.6 MiB at edits 1, 2, 10, 50, 100, 150, 200, 250 and 300. The
edit median for edits 2 to 50 was 13.9 ms and for 251 to 300 it was 13.7 ms. There is no growth. The Effect hooks add
0.7 MiB over stock. With `--timers`, the 30 s idle timers fired on `lsp_tick` in 1 to 4 ms. Memory then went once to
265.9 MiB, which matches 03's 266.6, and the next pull took 32 to 40 ms because the checker was rebuilt.

Background work after the first edit, mostly the auto-import registry build, was 341 ms against stock's 356 ms. The
Effect auto-import style transformer did not make it measurably slower.

### Sizes

gzip -9 and brotli -q 11, release settings (opt-level s, `-inlinehint-threshold=150`, fat LTO, one codegen unit,
panic=abort, `wasm-opt -Os`).

| module                                                                  | raw        | gzip      | brotli    |
| ----------------------------------------------------------------------- | ---------- | --------- | --------- |
| `tsrs-effect-lsp-single.wasm`                                           | 13,872,522 | 4,412,463 | 3,008,008 |
| `tsrs-effect-lsp-single.raw.wasm` (before wasm-opt)                     | 17,982,964 | 4,921,081 | 3,287,569 |
| `tsrs-lsp-single.wasm` (03, stock)                                      | 12,482,889 | 3,863,058 | 2,649,339 |
| `tsrs-effect-lsp-single.dev.wasm` (no LTO, opt 3, used while iterating) | 30,024,579 |           |           |

The Effect language service costs 1.39 MB raw and 0.36 MB brotli over the stock single-thread module. That is in line
with 04, where the checker and execute hooks cost 0.25 MB brotli and the LS hooks another 0.14 MB.

### Browsers

These ran headless through Playwright 1.63.0 in one module Web Worker, with the files in memory and served without
COOP or COEP. Every run reported `crossOriginIsolated === false` on page and worker and `typeof SharedArrayBuffer ===
"undefined"`. The session drives the worker over `postMessage`, one JSON-RPC string per message. Firefox and WebKit
round `performance.now()` to whole milliseconds without isolation. Chromium 153 and Firefox 151 (build 1532) are
Playwright's own builds. WebKit 26.6 is the downloaded build 2359 from experiment 03, behind its NixOS wrapper.

| measure                                               | Chromium        | Firefox         | WebKit          |
| ----------------------------------------------------- | --------------- | --------------- | --------------- |
| compile (streaming, localhost) / instantiate          | 115 / 72 ms     | 327 / 51 ms     | 217 / 171 ms    |
| didOpen of first file                                 | 490 ms          | 1460 ms         | 655 ms          |
| first pull main.ts                                    | 122 ms          | 27 ms           | 33 ms           |
| time to first diagnostics                             | 626 ms          | 1499 ms         | 700 ms          |
| first edit                                            | 22.7 ms         | 60 ms           | 24 ms           |
| background after first edit                           | 416 ms          | 933 ms          | 263 ms          |
| per edit, median (p90)                                | 15.1 (22.4) ms  | 58 (60) ms      | 14 (20) ms      |
| hover after edit                                      | 2.5 ms          | 9 ms            | 2 ms            |
| Effect hover cold / completion cold / codeAction cold | 40 / 21 / 15 ms | 29 / 11 / 4 ms  | 14 / 11 / 4 ms  |
| wasm memory after 50 edits                            | 253.6 MiB       | 253.6 MiB       | 253.6 MiB       |
| largest process RSS (high-water)                      | 218 (233) MiB   | 410 (417) MiB   | 555 (570) MiB   |
| feature probe vs native                               | 74/74 identical | 74/74 identical | 74/74 identical |

Firefox is again about four times slower per edit, as in 03 (47 ms there, 58 ms here). The rest matches 03 within a
few milliseconds, plus the Effect pass. The RSS column is the largest process the harness could attribute to the
browser. For WebKit that is the whole MiniBrowser web process, so it is not comparable across browsers.

## Crash recovery and nesting limits

### The host

`lsp-host.js` now exports `startRecoveringServer`, which has the same interface with an async `send`. It records the
`initialize` params, whether `initialized` was sent, and each open document's version and text. It applies
`didChange` edits itself, in UTF-16 units. It treats an exception as fatal when it is a `WebAssembly.RuntimeError`, a
`RangeError` matching "call stack", an `InternalError` or "too much recursion", or a WASI `proc_exit`. On a fatal
exception it does this:

1. It instantiates the already compiled module against the same in-memory file system, which takes 5 to 15 ms.
2. It replays `initialize` with a host id and drops the response, then `initialized`, then one `didOpen` per open
   document. Nearly all of the cost is the project load in the first `didOpen`.
3. If the trapping message was a request, it answers it with a `RequestFailed` (-32803) error, so the client does not
   hang.

Some documents crash the server by their text alone. If the trapping message was a `didOpen` or `didChange` of a
document, the host quarantines that document before rebuilding, because those messages only parse and the replay
would trap again. A document that traps twice at the same version is quarantined too. That case covers a pull that
overflows in the checker: the replay survives, and the next pull would trap again. Requests for a quarantined
document get an error without reaching the server. Its next `didChange` lifts the quarantine and reopens it with the
new text. If a replay still traps, the host quarantines and retries, up to three times.

I verified every part of this by running it in all four runtimes. `deep.js` opens a document that kills the parser
(20000 nested brackets), gets the quarantine error on the pull, edits the document to `export const ok: string = 1`,
and gets TS2322 back from the server.

### Recovery time

| runtime  | crash in didOpen (parser) | crash in pull (checker) | first pull of main.ts afterwards |
| -------- | ------------------------- | ----------------------- | -------------------------------- |
| Node     | 426-429 ms                | 430-446 ms              | 8-30 ms                          |
| Chromium | 377 ms                    | 447 ms                  | 9-80 ms                          |
| Firefox  | 1445-1455 ms              | 1512-1532 ms            | 23-109 ms                        |
| WebKit   | 327 ms                    | 371 ms                  | 14-39 ms                         |

After every recovery in every probe run, across all four runtimes, the probe pulled `main.ts` and got the same codes as
before the crash (377001), and hover returned the Effect hover. My first host version only quarantined after a replay
trapped, which cost a second rebuild, 0.7 to 0.97 s in Node and Chromium and 2.9 s in Firefox. The quarantine-first
rule above halved that.

What recovery loses: the checker and auto-import caches, so the next completion pays the cold cost and the auto-import
registry builds again on the next tick, about 400 ms. Timers and any in-flight server-to-client request are also lost.
None of this matters to the Scratchpad, which never waits for a server request.

### Nesting limits with the Effect pass on

Each probe opens a file of one shape, pulls diagnostics and hovers. The shapes are nested array and paren brackets,
nested `Effect.gen` (each level `const v = yield* Effect.gen(function* () {...})`), a left-deep `.pipe(Effect.map(...))`
chain, one `.pipe` call split into nine-argument groups, and nested `Effect.flatMap(e, (a) => ...)`. Each row shows the
deepest passing depth and the first failing depth. Bisected rows come from a second run with finer steps.

| shape                        | Node                 | Chromium         | Firefox          | WebKit                            | native      |
| ---------------------------- | -------------------- | ---------------- | ---------------- | --------------------------------- | ----------- |
| brackets                     | 1000 / 1500 (parser) | 500 / 600        | 1000 / 1500      | 5000 passes; 10000 fails (parser) | 5000+ in 03 |
| nested Effect.gen, Effect on | 180 / 190 (pull)     | 95 / 100 (pull)  | 160 / 170 (pull) | 500 / 525 (parser, didOpen)       | 2000 passes |
| nested Effect.gen, no plugin | 225 / 250            | 110 / 120        | 225 / 250        | 500 / 525                         |             |
| Effect.flatMap, Effect on    | 450 / 475 (pull)     | 225 / 250 (pull) | 450 / 475 (pull) | 725 / 750 (pull)                  | 2000 passes |
| Effect.flatMap, no plugin    | 450 / 475            | 225 / 250        | 450 / 475        | 725 / 750                         |             |
| `.pipe` chain                | 800 / 1200 (parser)  | 400 / 800        | 800 / 1200       | 2400 passes                       | 2000 passes |
| `.pipe` with 800 arguments   | passes               | passes           | passes           | passes                            |             |

The errors are `RangeError: Maximum call stack size exceeded` in Node and Chromium, `RangeError: Maximum call stack
size exceeded.` in WebKit, and `InternalError: too much recursion` in Firefox.

The Effect rules recurse deeper than plain checking for nested generators. They cost 10 to 30% of the depth limit in
Chromium, Node and Firefox (95 against 110, 180 against 225, 160 against 225). For `flatMap` nesting they cost nothing
measurable. In WebKit the parser gives out first on nested generators, at 525, before the checker or the Effect rules
come into play.

Are these limits realistic? Real code nests `Effect.gen` maybe 3 to 10 deep and a `pipe` chain 10 to 30 long. Even
Chromium's worst case of 95 nested generators is an order of magnitude past anything a person writes. Generated or
pasted code could still hit the limit, and the parser limits (brackets at 500 to 600 in Chromium) apply to data
literals too. With recovery in the host, such a file costs about half a second and an error on its own requests,
and the rest of the session carries on.

## Behavior differences from native

All of the following are differences in mechanics. None of them showed up in the feature probe.

- Everything from experiment 03 still applies. Debounces collapse into the next tick, timers fire only when the host
  ticks, there is no concurrency, cancellation does nothing, server requests are fire-and-forget, there is no loading
  progress, there is no file watching, and a panic aborts the instance.
- The Effect typeparser's three `recover` boundaries abort instead of recovering. Natively a checker panic inside
  `GetTypeAtLocation`, `couldBeStrictEffect` or the object-literal contextual-type helper returns "no type" and the
  request goes on. In the module the instance dies, and the recovering host restarts it. I inferred this from the code
  and did not trigger it.
- Deep nesting kills the instance at the depths above. Native handled 2000 levels of each Effect shape.
- The Effect pass makes the first request per file slower in wasm, about 55 ms on the first pull. Native pays it too,
  but on threads.

## Failures and blockers

None blocked the experiment. These are the problems I hit, with exact text:

- The patch conflict: `error: patch failed: crates/tsrs_lsp/src/lib.rs:10`. I fixed it by hand, as described above.
- The Effect test suite did not build without generated fixtures: ``couldn't read
`crates/ets_bundledeffect/src/../../../internal/bundledeffect/testfixtures.tar.gz`: No such file or directory (os
error 2)``. I generated them with repoctl's code.
- The pre-existing `tsrs_lsp` failures, which are the same with and without my patch. `test_initialize_code_action_kinds`
  fails with `left: [.. CodeActionKind("refactor.rewrite") ..]` because of Effect's patch 017. The three sanitizer
  tests fail with `reading .../ts-ref/tsc/testdata/baselines/reference/lsp/stackSanitizer/completionsDebugStackTrace.md:
No such file or directory`.
- My own bugs, all fixed: a fix picker that matched "Disable missingReturnYieldStar" when I meant "Add return", missing
  `textDocument.diagnostic` capabilities (relatedInformation came back empty until I set them), a session probe that
  assumed a 377001 diagnostic exists when the stock module has none, and a wait loop that matched itself in `pgrep`.

The engine stack limit is the only thing that would need a redesign, and it is not Effect's to fix. It comes from the
JS engine's native stack, which holds the wasm frames, and a page cannot raise it for a worker. The real fixes belong
to tsrs. One is to make parser and checker recursion explicit, which is a large refactor. The other is to run on a
larger stack through JSPI or wasm stack switching, once browsers ship them for this use. Effect's only part is the
10 to 30% extra depth its rules use on nested generators. If that mattered, Effect maintainers could look at the
recursion in the typeparser's generator walk, but the limit is not one real code reaches.

## Source change sizes

- tsrs: `tsrs-single-thread-lsp-on-effect.patch`, 14 files, +596 -8, against `fd57202` plus Effect's 32 patches.
  The only change from 03's patch is the one conflicting line.
- effect-tsgo: `effect-tsgo-ets_wasm_lsp.patch`, 244 lines: `crates/ets_wasm_lsp` (`lib.rs` 159 lines, of which 13
  are new against tsrs_wasm_lsp, `Cargo.toml` 27, `build.rs` 17) and a 13-line `Cargo.lock` entry, against `0e87d44`
  plus prototype 04's patch.
- Host and harness: `lsp-host.js` 424 lines, of which about 200 are new for recovery, plus the probe, session,
  native adapter and browser files listed in the prototype README.

## Verified and inferred

I verified these by running them: the patch application and its single conflict, all three builds and their import
lists and memory, the hook-crate grep, the native test results on patched and pristine trees, every row of the
feature table in Node, Chromium, Firefox and WebKit against native, the applied fixes and refactors with their
resulting text, the severity, inlay and skipLibCheck variants, every timing and memory number, the 300-edit flat
memory, timer firing, module sizes, the absence of cross-origin isolation, the nesting limits, the recovery times, the
post-recovery correctness, and the quarantine and lift.

These are inferred from reading code: that `recover` boundaries abort in wasm, that parking_lot locks are never
contended on one thread, that the extra cold cost of the first pull is the Effect type parser warming up, that
skipLibCheck is irrelevant because pulls check only the requested file, and why native pulls are slower.

## Verdict

As a replacement for the bridge's language service, this works today at prototype quality. It gives the same Effect
diagnostics, fixes, refactors, hover, completions, inlay hints and symbols as the server, with 14 to 15 ms re-checks
in Chromium and WebKit, 58 ms in Firefox, a 3.0 MB brotli module plus the effect declarations, and about 254 MiB of
wasm memory. Here is what remains before it could replace the server bridge.

1. On the website side, the client work. That means a worker transport for `@codemirror/lsp-client` with the
   recovering host, `lsp_tick` from a 0 ms timer after each message, and the bridge's pull-after-change logic moved
   into the worker or the page, since `textDocument/diagnostic` is still the only per-file path. Only then would
   anyone get the Effect quick fixes, refactors and inlay hints, because CodeMirror's client does not request code
   actions or inlay hints. That needs a code-action UI on top of `@codemirror/lsp-client`, or upstream support there.
2. In tsrs, upstreaming the single-thread pump as experiment 03 described: the `NO_THREADS` run queue, the
   callback-based `send_client_request`, and a library form of `tsrs_wasm`/`tsrs_wasm_lsp` so a wrapper does not have
   to `#[path]`-include `host.rs`. The Effect rebase showed that the pump and Effect's patches touch different code,
   so carrying both is cheap.
3. For Effect, publishing `ets_wasm_lsp` (or an `@effect/tsgo` wasm export) built in CI with the release settings.
   The crate is 13 lines of real code over tsrs's. If they want panics inside the typeparser to stay survivable in
   wasm, the `recover` sites need a non-panicking path, since wasm32-wasip1 will not unwind.
4. Accepting the stack limit as a known failure mode, handled by recovery. Nested `Effect.gen` at 95 levels in
   Chromium is far past real code, and a crash costs about 0.4 s. The quarantine rule keeps a bad file from looping.

I would not block on the stack limit. I would block on item 1, because without code actions in the editor, half of
what makes the Effect server worth running in the browser stays invisible.
