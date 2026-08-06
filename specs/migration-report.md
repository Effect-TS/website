# Migration Report: v3 → v4 Docs Snippet Migration

Tracks progress against `specs/v3-to-v4-docs-snippet-migration.md`. Updated per directory (§9.1).

## Per-file table

| File | Total fences | Marked | Asserted | Class C exclusions |
| ---- | ------------ | ------ | -------- | ------------------- |
| `batching.mdx` | 17 | 8 | 2 | 9: 4 type-only shorthand (`Request<Value, Error>`, `RequestResolver<A>` x2, a resolver-effect type signature), 5 removed-API continuations (`Effect.withRequestBatching`, `Effect.withRequestCaching`, `Layer.setRequestCache`+`Request.makeCache` x2, a plain caching-disabled continuation) |
| `configuration.mdx` | 23 | 9 | 2 | 14: 11 real-env-var fences left as copy-paste-and-run-with-tsx scripts (primitives/defaults/redacted/secret-number/array/hashSet/hashMap/validate/App.ts/nested-namespace/constantCase — code migrated where APIs changed, not marked, since marking would make the doctest run depend on unset env vars), 1 deprecated `Secret` example (module removed entirely in v4, left unchanged), 2 removed path/sequence-delimiter-customization demos with no v4 equivalent (left unchanged) |

## Unresolved items

- **API names with no v4 replacement**: `Effect.withRequestBatching`, `Effect.withRequestCaching`, `Layer.setRequestCache`, `Request.makeCache` (`batching.mdx`). Confirmed absent from `node_modules/effect/src/{Effect,Layer,Request}.ts`. A differently-shaped resolver-level caching API exists (`RequestResolver.asCache`/`withCache`/`persisted`, `@since 4.0.0`), but adopting it moves caching from the call site to the resolver's definition site — a structural rewrite of the surrounding example, not a mechanical migration. Left the affected fences (already Class C, unmarked, non-twoslash continuations) byte-for-byte unchanged; inline code spans naming these removed APIs in prose also left unchanged since there's no v4 name to rename to.
- **Link targets that couldn't be verified**: none found yet.
- **Table-vs-installed discrepancies**: none found yet.
- **Prose now imprecise after a source-of-truth-justified code fix, left unchanged per one-edit rule**: `batching.mdx`, "Declaring Resolvers" section — "A `RequestResolver` requires an environment `R`..." is no longer accurate since v4's `RequestResolver<A>` dropped its second (`R`) type parameter, but this is prose, not one of the spec's two carved-out exceptions to the verbatim-prose rule. Flagging for human review/decision rather than silently editing prose.
- **`configuration.mdx` — removed feature, no v4 replacement**: `ConfigProvider`'s path/sequence-delimiter customization. v3's `ConfigProvider.fromMap`/`fromEnv` accepted `pathDelim`/`seqDelim` options; v4's `ConfigProvider.fromEnv({env, preserveEmptyStrings})` hardcodes `_` as the only path delimiter with no customization option, and has no sequence-delimiter concept at all (array/record separators moved to `Config.Array`/`Config.Record`'s own `separator`/`keyValueSeparator` options, which are per-value, not per-provider). "### Handling Nested Configuration Values" (demonstrates `ConfigProvider.fromMap`'s default `.` separator) and "### Loading Configuration from Environment Variables" > "Changing the Path Delimiter" (explicit `pathDelim`/`seqDelim` options) are left byte-for-byte unchanged — there's no way to reproduce either demo's actual teaching point in v4. (One adjacent fence, "Customizing the Path Delimiter", asked for `_` as the separator, which is already v4's hardcoded default, so that one *was* migrated — it just no longer needs an explicit option.)
- **`configuration.mdx` — removed module, no replacement (already flagged as deprecated toward one)**: `effect/Secret` doesn't exist in v4 at all — not simply still-deprecated, fully removed. The "## Deprecations > Secret" section's example fence (`secret.ts`) can't even type-check any more, left byte-for-byte unchanged. `Config.redacted`/`Redacted` (used earlier in the same file) is already documented in the deprecation notice as the intended replacement, so a human may want to delete this whole section now that the deprecated API is gone rather than keep documenting a nonexistent module — that's a deletion decision, not mine to make.
- **`configuration.mdx` — runtime bug found via doctest gate, not a rename**: v3-style `provider1.pipe(ConfigProvider.orElse(() => provider2))` (passing a thunk) throws `TypeError: second.load is not a function` at runtime in v4 — `ConfigProvider.orElse(that)`'s `that` parameter is the fallback provider value directly, not a lazy thunk. Fixed to `ConfigProvider.orElse(provider2)`.
- **Reference doc discrepancy**: `migration/MIGRATION.md` does not exist at pinned commit `a94cbed84e9e49bea4bff925599c0f19c4e3deab` (confirmed via GitHub contents API — the `migration/` dir at that commit contains only the individual guide files listed in spec §4.2 plus an `annotations/` subdirectory of per-module YAML data not referenced by the spec). All other listed guide files (`v3-to-v4.md`, `services.md`, `error-handling.md`, `forking.md`, `yieldable.md`, `fiberref.md`, `runtime.md`, `scope.md`, `equality.md`, `cause.md`, `layer-memoization.md`, `fiber-keep-alive.md`, `generators.md`, `schema.md`) fetched successfully and cached under `specs/_references/`.

## Verification log

### G0 — Setup

- Vendored `@effect/doctest` from `Effect-TS/effect` at commit `c1ed0ac97cd04e8ed359ca7956ba604a88fc2bb6` (`packages/tools/doctest/{package.json,src/**}`) into `vendor/doctest/`. Version matches installed `effect@4.0.0-beta.104`.
- Applied `.mdx` format-detection patch (`patches/doctest-mdx.patch`) to `vendor/doctest/src/Source.ts`.
- Added devDependencies: `@effect/doctest@file:vendor/doctest`, `vitest@^4.1.10` (resolved `4.1.10`), `rolldown@^1.1.5` (resolved `1.2.3`), `@types/node` (resolved `26.1.2`).
- `pnpm peers check` reports an unmet `effect` peer for `@effect/doctest` — expected: the vendored `package.json` still declares `"effect": "workspace:^"` from its source monorepo; harmless outside that workspace. Pre-existing unrelated peer warnings for `astro`/`typescript` (astro-tweet, astro-expressive-code, i18next, @astrojs/check) were present before this change.
- Created `vitest.docs.ts`, added `doctest` / `doctest:file` scripts to `package.json`.
- Created `scripts/extract-doctest-snippets.mjs` (type-gate extraction for G2).
- Added `test-results/` to `.gitignore`.
- **F1 workaround needed**: Node's native TypeScript type-stripping refuses to process `.ts` files located under `node_modules` (`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`), which vitest's config loader and plain `node` both hit when importing `@effect/doctest/Plugin` / `@effect/doctest/Source` via the package specifier (resolves into the pnpm store, physically under `node_modules`). Fix: `vitest.docs.ts` and `scripts/extract-doctest-snippets.mjs` import directly from the vendor path (`./vendor/doctest/src/Plugin.ts`, `../vendor/doctest/src/Source.ts`) instead of the package specifier — same source, but outside `node_modules` so Node's native loader strips types normally. This is a project-local workaround (not a change to the vendored package itself) and is distinct from the spec's anticipated `.mdx`-passthrough-module workaround, which was not needed.
- **Smoke test**: `src/content/docs/v4/_smoke.mdx` with one Class-A fence (`const sum = 1 + 1 // => 2`) — `pnpm doctest` discovered and passed 1/1 test. File deleted after verification, per §8.1.7.

### Post-G0 infra fixes (found while migrating `batching.mdx`)

- **Doctest snippet modules weren't parsed as TypeScript.** Extracted snippet virtual module ids keep the source file's `.mdx` extension (e.g. `batching.mdx?effect-doctest=snippet&index=5`), so Vite's extension-based loader selection skipped its TS transform and raw `interface`/type-annotation syntax reached the plain-JS parser, failing all 8 marked fences with a parse error. Fixed with a `pre` Vite plugin in `vitest.docs.ts` that strips types on ids matching the doctest snippet protocol before Vite's default transform runs, using `node:module`'s `stripTypeScriptTypes` (not the `typescript` package's `transpileModule` — this repo's `typescript` dependency is TS 7 / tsgo, whose npm package no longer ships the classic compiler API).
- **`pnpm check` (root `tsc -b`) pulled `vendor/doctest` into the app's strict type-check.** The root tsconfig's `"**/*"` include plus `allowJs: true` (from `astro/tsconfigs/strictest`) reached `vendor/doctest/src/*.ts` via `scripts/extract-doctest-snippets.mjs`'s and `vitest.docs.ts`'s relative imports, failing on `noUncheckedIndexedAccess`/`exactOptionalPropertyTypes` errors in vendored code never written against those settings. Fixed by excluding `vendor`, `test-results`, `vitest.docs.ts`, and `scripts/extract-doctest-snippets.mjs` from the root `tsconfig.json` — the latter two are tooling entry points, not app source, and are type-checked implicitly when run (or by `tsconfig.doctest.json`) rather than by `tsc -b tsconfig.json`.
- **G2 type gate config.** Added `tsconfig.doctest.json` (extends root, `moduleResolution: bundler`, `types: ["node"]`) with `noUnusedLocals`/`noUnusedParameters` disabled: narrative doc fences intentionally leave some declarations unused within a single isolated extracted snippet (e.g. a resolver shown only for contrast against a later approach, or a model interface reused by a *different* fence in the same file but not the current one) — this isn't a type-correctness problem, just an artifact of type-checking each fence as a standalone file.

### `batching.mdx` (G1–G3)

- G1 (`pnpm doctest:file`): 8/8 passed.
- G2 (`tsc -b tsconfig.doctest.json` over the 8 extracted snippets): clean after 3 real fixes (not just renames) — see the migration commit body for the full list: `Effect.andThen` doesn't accept a callback returning a plain (non-`Effect`) value in v4, so the "resolve `HttpService` before constructing the resolver" pattern needed `Effect.map`, not `Effect.andThen`; `Request.tagged` constructors for tag-only requests (no extra fields) are called with no arguments in v4 (`GetTodos()`, not `GetTodos({})`) since `Request.Constructor` now applies `Types.VoidIfEmpty`; and one `RequestResolver.fromEffect` callback needed an explicit return-type annotation for its success type to infer correctly through the `Effect.map` wrapper (matches the annotation style already used elsewhere in the same file).
- G3 (`pnpm check`, `pnpm fmt`): clean. `oxlint` has no `.mdx` coverage in this repo, so lint is not applicable to doc fences.

### Post-`batching.mdx` infra fix (found while migrating `configuration.mdx`)

- **`node:module`'s `stripTypeScriptTypes` with `mode: "strip"` rejects constructor parameter properties.** `configuration.mdx`'s demo classes (`HostPort`, `ServiceConfig`) use `constructor(readonly host: string, ...) {}`, which "strip" mode can't handle (removing the modifier requires *generating* an assignment, not just deleting type syntax) — failed 5 of 9 marked fences with "TypeScript parameter property is not supported in strip-only mode". Fixed by switching `vitest.docs.ts`'s plugin to `mode: "transform"`. Re-verified `batching.mdx` still 8/8 after the change.

### `configuration.mdx` (G1–G3)

- G1 (`pnpm doctest:file`): 9/9 passed (after the transform-mode fix above and the `ConfigProvider.orElse` runtime-bug fix noted under Unresolved items).
- G2 (`tsc -b tsconfig.doctest.json` over 17 extracted snippets total across both migrated files so far): clean.
- G3 (`pnpm check`, `pnpm fmt`): clean.
- Config/ConfigProvider turned out to be one of the more heavily restructured modules encountered so far — see the migration commit body for the full list of reshaped APIs (`Config.schema` replacing `Schema.Config` with swapped argument order, `Config.Array`/`Config.Record` as Schema producers, `ConfigProvider.fromUnknown` replacing `fromJson`, `Effect.provideService(effect, ConfigProvider.ConfigProvider, provider)` replacing the removed `Effect.withConfigProvider`, etc.). All of it was verified directly against `node_modules/effect/src/{Config,ConfigProvider,Schema}.ts`, including reading the JSDoc usage examples embedded in that source (which are themselves doctested in the `effect` package) as ground truth for exact call shapes.

### G4–G5

Not yet run — `runtime.mdx` and all directories are still pending.
