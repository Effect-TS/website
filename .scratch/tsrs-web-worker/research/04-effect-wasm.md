# Experiment 04: an Effect-patched batch WASM module

Question: can the stock `@tsrs/wasm` batch module (one `tsc` run per instance, JSON diagnostics) be rebuilt with the
Effect language service so that it reports the Effect diagnostics the Scratchpad gets today from the server-hosted
`@effect/tsgo` LSP?

Short answer: yes, and it was much easier than expected. A 125-line cdylib that registers two Effect hook crates and
then runs tsrs_wasm's own code compiled for `wasm32-wasip1` on the first try, needed no cfg stubs, and produces the
same Effect diagnostics as the native Effect binary, in Node and in a Chromium Web Worker. It adds about 1.0 MB raw and
250 KB brotli to the module and roughly 10% to a check when lib checking is skipped. What it cannot give is anything
the LSP gives beyond diagnostics: quick fixes, refactors, completions, hover.

Prototype files: `../prototypes/04-effect-wasm/`. Modules: `../artifacts/tsrs-effect.wasm` and friends.

## Setup that worked

effect-tsgo `0e87d44` ("chore: update upstreams (#1078)") records in `_packages/tsgo/upstream.json` that
`tags.tsrs.latest` is `7.1.0-beta.tsrs4`, whose `gitHead` is `fd57202e5dedb2124c46bbb2c90938c1647b12ea`. That is a
different commit from the `e083fd7` shallow clone in the scratch dir, so I fetched `fd57202` on its own. The patch
README (`_patches/tsrs/README.md`) says `repoctl submodules setup` checks tsrs out at `tsrs/` inside the effect-tsgo
checkout and applies `_patches/tsrs/*.patch` in bytewise filename order with `git apply`, no fuzz. I did the same by
hand. All 32 patches applied cleanly (88 files, +1978/-359). The patched tsrs crates depend back on effect-tsgo by path
(`tsrs_core`, `tsrs_execute`, `tsrs_incremental` and `tsrs_tsoptions` depend on `../../../crates/ets_etscore`), so the
patched tree only builds inside an effect-tsgo checkout.

One snag. `cargo build --locked` failed with

```
error: cannot update the lock file .../effect-tsgo/Cargo.lock because --locked was passed to prevent this
```

The committed lock records the tsrs path crates at version `0.25.0`, and the tsrs4 crates are `7.1.0-beta.tsrs4`.
repoctl rewrites exactly those version lines on setup (`syncTsrsCargoLock` in `_tools/repoctl/src/rust.ts`). Running
`cargo metadata` once produced the same edit; I checked that the diff touched only tsrs crate version lines. After
that, `cargo build -p ets_tsrs --features cli --locked` built the native Effect `tsrs` in 1 min 52 s (dev profile, which
is opt-level 3 here). It prints
`Version 7.1.0-beta+effect-tsgo.0.73.3 (tsrs 7.1.0-beta.tsrs4, microsoft/TypeScript@3e9236361fa9)` and reports the
Effect diagnostics on the test file (table below). No CMake or mimalloc trouble, since the `rs` wrapper has both.

## The glue crate

`crates/ets_wasm` in the effect-tsgo workspace is a cdylib with three files.

- `src/lib.rs` is tsrs_wasm's `lib.rs` with 16 changed lines. It includes tsrs_wasm's `host.rs`, `json.rs` and
  `sys.rs` unchanged through `#[path]`, so the ABI (`tsrs_input`, `tsrs_run`, `tsrs_output`, `tsrs_output_len`, the
  request encoding and the JSON reply) is byte for byte tsrs_wasm's. Before the first compile it calls
  `ets_etscheckerhooks::init()` and `ets_etsexecutehooks::init()`, which both sit behind a `Once`.
- `build.rs` is a copy of tsrs_wasm's, which links the 80 MiB shadow stack.
- `Cargo.toml` depends on the two hook crates and on the eight tsrs crates tsrs_wasm uses, by path, like `ets_shim`.

I copied instead of depending because `tsrs_wasm` is `crate-type = ["cdylib"]` only (cargo skips LTO for a crate that
is also an rlib), so nothing can depend on it. A cleaner upstream shape is a tsrs_wasm feature or a small rlib split;
see the verdict.

I left out `ets_etslshooks`. It registers code fixes, completions, refactors, hover and inlay hooks, and batch `tsc`
never calls any of them. With the `lshooks` feature turned on, the module grows by 497 KB raw and 136 KB brotli for
nothing usable, because the batch ABI has no request that would reach those hooks.

## Compile failures

There were none in the WASM build itself, which surprised me given the risk list. `cargo check --target
wasm32-wasip1 -p ets_etscheckerhooks -p ets_etsexecutehooks -p ets_etslshooks` passed in 1 min 10 s, including
`ets_shim` and with it `tsrs_lsp`, `tsrs_ls`, `tsrs_project`, `tsrs_fswatch` and `tsrs_ipc`. The full cdylib then
built and linked with no source change. `ets_bundledeffect` (flate2, tar, sha2) is not a dependency of the checker or
execute hooks, so it never enters the module.

The release module imports exactly what the stock module imports: `tsrs_host.fs`, `tsrs_host.fs_take` and the same 17
WASI functions. No `thread-spawn`. The unoptimized dev build also imported `path_rename` and `path_unlink_file`; the
stock host answers unknown WASI calls with `ENOSYS`, and fat LTO removed both in the release build.

Things that did go wrong, all on my side or in the setup:

1. The lock version mismatch above, on both the effect-tsgo lock and (for the control build) tsrs's own lock. The
   patched tsrs workspace's lock lacks `ets_etscore`, `ets_go` and `parking_lot`, so `tools/wasm/build.sh` in the
   patched tree fails with the same "cannot update the lock file" error until the lock is regenerated. Effect never
   builds that tree on its own, so this only matters for my control build. The fix is
   `tsrs-standalone-cargo-lock.patch` (+67 lock lines).
2. My first release build lacked `build.rs`, so the module got the default 1 MiB shadow stack (initial memory 222
   pages instead of 1486). It still passed every test here, and it reported 101 MiB of memory against the stock
   module's 179 MiB, which looked like a win and was not. Deep expressions would have trapped. With the copied
   `build.rs` the numbers match the stock module. Anyone repeating this should check
   `wasm-objdump -x -j Memory` before reading memory figures.

## Diagnostics

Test program `test-project/main.ts`, bridge tsconfig (`packages/lsp-bridge/workspace.tsconfig.json`, plugin entry
`@effect/language-service`, no `skipLibCheck`), effect 4.1.5 declarations in memory. Positions are 1-based line:column
from the JSON `startPosition`/`endPosition`. Category follows TypeScript: 0 warning, 1 error, 2 suggestion.

| Planted issue                         | Code   | Category     | Range       | Message                                                                                                                                                                                                      |
| ------------------------------------- | ------ | ------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| floating `Effect.log("floating")`     | 377001 | 1 error      | 9:3-9:25    | This Effect value is neither yielded nor used in an assignment. effect(floatingEffect)                                                                                                                       |
| `yield` without star                  | 377008 | 1 error      | 15:13-15:18 | This uses `yield` for an `Effect` value. `yield*` is the Effect-aware form in this context. effect(missingStarInYieldEffectGen)                                                                              |
| `yield* Effect.fail` without `return` | 377006 | 1 error      | 23:5-23:10  | This Effect never succeeds; using `return yield*` preserves a definitive generator exit point for type narrowing and tooling support. effect(missingReturnYieldStar)                                         |
| single-return `Effect.gen`            | 377017 | 2 suggestion | 29:28-31:3  | This Effect.gen contains a single return statement. effect(unnecessaryEffectGen)                                                                                                                             |
| try/catch in `Effect.gen`             | 377012 | 2 suggestion | 35:3-40:4   | This Effect generator contains `try/catch`; in this context, error handling is expressed with Effect APIs such as Effect.try, Effect.tryPromise, Effect.catch, Effect.catchTag). effect(tryCatchInEffectGen) |
| `const wrong: string = 1`             | 2322   | 1 error      | 44:14-44:19 | Type 'number' is not assignable to type 'string'.                                                                                                                                                            |

The 377008 diagnostic carries one `relatedInformation` entry, code 377007, "Inside this Effect generator.", pointing at
the `Effect.gen` call on line 14. The native binary prints the same six diagnostics at the same positions with the same
text and severities (it prints 1-based columns, so `main.ts(9,3)` and so on). The exit status is 2 in both.

A second program closer to the Scratchpad default (Context.Service, Schema, Stream, Layer) gave five diagnostics,
identical between WASM and native: 377098 schemaNumber, TS2322, 377001 floatingEffect, 377037 schemaSyncInEffect and
377124 provideLayerSucceedToProvideService.

The planted `missingReturnYieldStar` case is an `if` branch with `yield* Effect.fail(...)` and no `return`. A
`return Effect.fail(...)` without `yield*` would trigger a different rule (returnEffectInGen); I did not test that
variant.

## Plugin options

All of these were checked by running, in WASM and native, with identical results.

- `diagnosticSeverity: { floatingEffect: "off", tryCatchInEffectGen: "error", unnecessaryEffectGen: "warning" }`
  drops 377001, turns 377012 into category 1 and 377017 into category 0.
- `includeSuggestionsInTsc: false` drops both suggestions (377017, 377012), leaving four diagnostics.
- With no plugin entry only TS2322 comes back. The Effect rules are off unless the tsconfig asks for them.
- `// @effect-diagnostics-next-line floatingEffect:off` suppresses a floating Effect.
- Exit code filtering works: a file whose only diagnostic is a suggestion exits 0, because the execute hook applies
  the default `ignoreEffectSuggestionsInTscExitCode: true`.

I did not test `overrides`, the per-file option list, or `skipDisabledOptimization`.

## JSON encoding and code-fix metadata

The stock encoder (`tsrs_wasm/src/json.rs`, unchanged) handles the six-digit codes, relatedInformation and the
suggestion category without trouble. The JSON keys are `fileName, pos, end, startPosition, endPosition, sourceLines,
code, category, text`, plus `relatedInformation` when present. There is no code-fix field, and none could be filled:
Effect's fixes come from `ets_etslshooks` through the language service's code-action request, not from the diagnostic.
The rule name is only recoverable from the message suffix `effect(<rule>)`.

## Numbers

Node 24.22.3, stock `@tsrs/wasm` host for all three modules, same in-memory project. Runs 1 to 7 of 8 (run 0 is the
cold first instance). The machine was shared with three other experiments, so expect about plus or minus 10% noise.
"nohooks" is the control: the Effect-patched tsrs's own `tsrs_wasm` built with tsrs's `tools/wasm/build.sh`, no hooks
registered.

| Module                              | Full check, median | skipLibCheck, median | Memory full / skipLibCheck |
| ----------------------------------- | ------------------ | -------------------- | -------------------------- |
| stock `@tsrs/wasm` 7.1.0-beta.tsrs4 | 1701 ms            | 537 ms               | 179 / 134 MiB              |
| Effect-patched tsrs, no hooks       | 1734 ms            | 553 ms               | 180 / 134 MiB              |
| Effect module (`tsrs-effect.wasm`)  | 1774 ms            | 599 ms               | 180 / 135 MiB              |

The bridge tsconfig has no `skipLibCheck`, so its full check spends most of its time checking effect's own `.d.ts`
files. Effect's patches alone cost little. The Effect rules add about 40 ms to a full check and about 60 ms (11%) to a
check with `skipLibCheck`, and about 1 MiB of memory. The rules run per user source file, so the cost will grow with
the size of the Scratchpad files, not with the size of effect. The first cold run is 2.1 to 2.3 s for all three. For
comparison, the native dev-profile Effect binary checks the same project in 0.77 s wall time with several threads.

In headless Chromium 153 (Playwright, module Web Worker, stock `browser.js`) the Effect module compiled in 85 ms
(served from localhost), the first check took 2170 ms and the next four 1318 to 1534 ms, at 180 MiB. It returned the
same six diagnostics as Node.

Module sizes. gzip -9 and brotli quality 11, as `tools/wasm/build.sh` reports them; the 2.25 MB brotli quoted for the
stock module in the brief was likely a lower brotli quality.

| Module                                   | Raw        | gzip -9   | brotli -q 11 |
| ---------------------------------------- | ---------- | --------- | ------------ |
| stock `@tsrs/wasm`                       | 10,041,556 | 2,910,150 | 1,986,988    |
| patched tsrs, no hooks                   | 10,132,269 | 2,941,717 | 2,011,298    |
| Effect module, before wasm-opt           | 13,787,640 | 3,640,361 | 2,426,387    |
| Effect module (`tsrs-effect.wasm`)       | 11,034,534 | 3,294,201 | 2,237,053    |
| Effect module plus LS hooks registration | 11,531,376 | 3,496,366 | 2,373,500    |

The Effect rules and type parser cost 0.99 MB raw and 250 KB brotli over the stock module. The release build takes
about 2.5 minutes on 32 cores.

## Source changes

- tsrs: none beyond Effect's own `_patches/tsrs`. The control build needs the lock patch, nothing else.
- effect-tsgo: the new `crates/ets_wasm` (125-line `lib.rs` that differs from tsrs_wasm's in 16 lines, a 35-line
  `Cargo.toml`, a 19-line copy of `build.rs`), and `Cargo.lock`: the tsrs version sync repoctl would do, plus the new
  crate. In total `effect-tsgo-ets_wasm.patch` is 531 lines, most of them lock churn.
- A build script that mirrors `tools/wasm/build.sh` for the new crate.

## What I verified and what I inferred

Verified by running: the patch application, the native build and its output, the WASM check of all three hook crates,
the release build and its imports, every diagnostics table above in Node, the Chromium Web Worker run, the plugin
option results, the directive, the exit codes, the timings and the sizes.

Inferred from reading source: that the LS hooks are never reached by batch `tsc` (I saw no batch code path calling
them, and the diagnostics are identical without them), that the Effect rule cost scales with user files and not with
library files, and that no quick-fix data could be carried in the JSON without the language-service path. I did not
test large or deeply nested inputs with the Effect module, so the stack size behaviour is assumed from the copied
`build.rs`, not measured.

## Verdict

Effect could publish this as an `@effect/tsgo-wasm` package (or a `wasm` export of `@effect/tsgo`) with little work.
The JS host can be `@tsrs/wasm`'s files unchanged, or a dependency on `@tsrs/wasm` with the module swapped through its
`module`/`url` option, since the ABI is identical. What it would take:

1. On the tsrs side, a supported way to wrap tsrs_wasm. Today it is a cdylib with no library half, so the glue copies
   its sources. Either a tiny `tsrs_wasm_core` rlib with `run()` and the ABI, or a hook in `tsrs_wasm` for code to run
   before the first compile, removes the copy. The `build.rs` stack setting has to move with it.
2. On the Effect side, the crate above, a CI job running a `build.sh` equivalent, and the module size check. The
   tsrs-version lock sync that repoctl already does covers the lock.
3. A decision about the LS features. This module replaces only the diagnostics half of the current Scratchpad LSP.
   Quick fixes, refactors, completions, hover and Effect inlay hints need a language-service request ABI in WASM,
   which tsrs does not ship. The good news from this experiment is that `ets_etslshooks` and the tsrs LSP crates
   already compile for `wasm32-wasip1`, so that is an API and threading-model design question, not a porting one.

For the Scratchpad, a worker running this module would give the same diagnostics the bridge gives now, at about
0.6 s per check with `skipLibCheck` or 1.7 s without it, for a 2.24 MB brotli download plus the effect declarations.
Adding `skipLibCheck: true` to the bridge tsconfig would roughly triple the check speed and does not change the Effect
results.
