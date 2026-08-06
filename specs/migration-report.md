# Migration Report: v3 → v4 Docs Snippet Migration

Tracks progress against `specs/v3-to-v4-docs-snippet-migration.md`. Updated per directory (§9.1).

## Per-file table

| File | Total fences | Marked | Asserted | Class C exclusions |
| ---- | ------------ | ------ | -------- | ------------------- |

_(populated as directories are processed)_

## Unresolved items

- **API names with no v4 replacement**: none found yet.
- **Link targets that couldn't be verified**: none found yet.
- **Table-vs-installed discrepancies**: none found yet.
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

### G1–G5

Not yet run — no `.mdx` files under `src/content/docs/v4/` have been migrated yet.
