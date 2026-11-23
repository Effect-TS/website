# 13: Real-Container Playwright suite and CI job

Type: task
Status: resolved
Blocked by: 08, 09, 10
Spec: ../spec.md

Add a Chromium Playwright suite that runs against a real WebContainer.

- [x] Boot, install, and types arriving with no diagnostics for the seed
- [x] A Run produces the expected output, and editing triggers a re-run
- [x] Introducing a type error skips the Run with the reason shown
- [x] `pnpm add <small pkg>` through the host spawn API syncs `package.json` and `pnpm-lock.yaml` back, reloads types, and an import of the package resolves with no diagnostics
- [x] A legacy v4 share loads and runs
- [x] A separate, non-blocking CI job with retries and traces on failure, plus notes on how to promote it to gating

## Answer

The real-Container tests now have their own Chromium suite: `apps/web/test/e2e/scratchpad-container.spec.ts`, run by `playwright.scratchpad-container.config.ts` and the `test:e2e:scratchpad-container` task. CI runs it as a separate job that doesn't block the workflow.

### Suite

Each test boots and installs its own Container (one worker). There are six cases:

1. **Boot, install, types.** Diagnostics stay hidden while `booting` and `installing`. The phase passes through `installing`/`loading-types` and reaches `ready`. `pnpm-lock.yaml` appears in the explorer, hover resolves `@effect/platform-node`, and neither seed file has error diagnostics.
2. **Run and re-run.** Run #1 (`initial`) prints the seed's welcome line. Replacing `src/main.ts` with another log message gives `data-run-id="2"` with trigger `src/main.ts changed` and the new text. The old text is gone, because each Run clears the output.
3. **Type error.** The skip notice shows "Run skipped", "previous Run (#1)" and a clickable `src/main.ts:L:C` that opens the file. `data-run-skipped="true"` is set and the Run number stays at 1. Fixing the error gives Run #2.
4. **`pnpm add`.** `pnpm add kleur@4.1.5` runs through `Container.spawn`, then an install cycle (`Dependencies.install`). The `package.json` tab shows `"kleur"`. The autosaved `pnpm-lock.yaml` contains `kleur@4.1.5`, so the lockfile came back and travels with the Workspace. The phase returns to `ready`. Then `import kleur from "kleur"` in `src/main.ts` has no error diagnostics, hover on `kleur.bold` resolves, and Run #2 prints its output.
   - **Package choice.** `kleur` is tiny, has no dependencies, ships its own `index.d.ts` through `exports`, and works as a default import under NodeNext. `ms@2` has no bundled types, so under `strict` its import would be an error (TS7016). The version is pinned so the lockfile assertion doesn't drift.
5. **Legacy v4 share.** A share shaped like the ones `/play` wrote during the v4 beta: an extensionless `./Program` import, `pnpm install -E` as prepare, no language-service plugin or `verbatimModuleSyntax`, and `initialFilePath: src/Program.ts`. The test encodes it the way `WorkspaceCompression` does (`deflateRawSync` then base64), POSTs it to the dev server's in-memory shortener (`/api/playground/shorten`), and opens `/scratchpad#<hash>`. `src/Program.ts` opens first with no load notice, and `main.ts` now imports `./Program.js`. The Container installs it, Run #1 prints `legacy v4 share ran`, and there are no error diagnostics. `effect` is on `latest` rather than the beta pin, so the test exercises the loader's repairs, not an old release.
6. **Stop and Restart.** A `setInterval` ticker runs as Run #2 (`data-run-status="running"`, badge `data-run-state="running"`). Stop sets the status to `stopped`, prints `stopped`, sets the badge to `idle` and disables Stop, and no output arrives in the following second. Restart starts Run #3 with trigger `restart`. Restart while running replaces it with Run #4. The test stops the Run at the end.

### Test hook

The host spawn API had no way in from page JS, so `src/features/scratchpad/test-hook.tsx` adds `window.__scratchpadTest`:

- `spawn(command, args?)` runs a process in the Workspace dir through `Container.spawn` and returns `{ exitCode, output }`.
- `install()` calls `Dependencies.install`.

It is two `runtime.fn` atoms on the session runtime, published by a component while the Scratchpad is mounted. `Scratchpad.tsx` creates it only when `import.meta.env.DEV` is true, using `React.lazy(() => import("./test-hook.tsx"))` inside that ternary, so production builds drop the module and the global. An esbuild bundle of `Scratchpad.tsx` with `DEV=false` has no reference to it. A full `astro build` needs the deploy adapter, so it wasn't run. Both e2e configs run `astro dev`, which is how the suite reaches the hook.

`spawn` does not trigger the sync-back. The test calls `install()` afterwards, following ticket 08's note on how the host handles a `pnpm add`. When a terminal lands, it should do the same after package-changing commands, or `Dependencies` should watch the Container's `package.json`.

### Skipping offline

When StackBlitz is unreachable, boot never fails: the phase stays `booting` indefinitely. I checked this by aborting the browser's non-local requests. Waiting for the phase would therefore time out, not skip. `scratchpad-helpers.ts` adds `skipUnlessContainerReachable()`. It sends a HEAD to `https://stackblitz.com` (the boot iframe's origin) and `https://registry.npmjs.org` from Node, once per worker. Any HTTP response counts as reachable; only network errors and timeouts skip. The container spec calls it in `beforeAll`, and `awaitInstalledTypes` calls it too, so the worker suite's type-dependent tests also skip offline instead of timing out. A failed boot or install still skips, as before.

Verified: with the probe pointed at an unresolvable host and the browser's external requests aborted, all 6 tests skip in about 2 s. If the hosts are reachable but boot hangs, the tests fail, which is a real failure.

### Worker suite

- The real-Container smoke test moved from `scratchpad-worker.spec.ts` into the container spec, split into cases 1 and 3.
- The worker spec now imports the shared helpers from `apps/web/test/e2e/scratchpad-helpers.ts`.
- Its language-server tests still wait for `ready`, because Effect's types only come from the Container (ADR 0004). They can't be fully network-independent without a types fixture. They do skip cleanly offline now.
- `playwright.config.ts` (the alchemy/`/play` suite) used to ignore only the worker spec, so it picked up `scratchpad-share.spec.ts` and would have picked up the new spec. It now ignores `scratchpad-(worker|share|container)`.

### CI

`scratchpad-container-e2e` in `.github/workflows/check.yml`:

- `continue-on-error: true`, Chromium only, 30-minute timeout.
- Builds `packages/tsrs-lsp-wasm` with the same `./.github/actions/tsrs-lsp-wasm` action, which shares its cache, as the worker e2e job.
- Runs `vp run test:e2e:scratchpad-container` with `SCRATCHPAD_CONTAINER_RETRIES=2`.
- The config keeps traces and screenshots of failed attempts (`trace: retain-on-failure`) under `test-results/scratchpad-container/`. A step with `if: !cancelled()` uploads them as `scratchpad-container-e2e-traces` for 14 days, so a test that only passed on retry still leaves its trace.

Retries default to 2 on CI and 0 locally (`SCRATCHPAD_CONTAINER_RETRIES` overrides), and the port comes from `SCRATCHPAD_CONTAINER_WEB_PORT` (default 14323).

### Promoting it to gating

1. Watch about 20 runs on `main` and PRs. Each run has a GitHub annotation for any test marked flaky, and the trace artifact appears for any failed attempt. Promote when nothing fails outright, and when flakes stay rare and are explained (StackBlitz or registry outages, not timing).
2. Remove `continue-on-error: true` from the job and add "Scratchpad Container E2E" to the branch protection's required checks.
3. Keep `retries: 2`. Consider `--fail-on-flaky-tests` only once the external services prove steady.
4. Being offline still skips rather than fails. If a skipped run should count as a failure in CI, make the probe fail when `CI` is set.

### Timings and flakiness (local, Chromium, this machine)

Three full runs, 18 of 18 passing, no retries, no flakes: 3.2, 3.1 and 3.2 minutes per run.

| Test                                                             | Time per test |
| ---------------------------------------------------------------- | ------------- |
| Boot to `ready` (`booting → installing → loading-types → ready`) | 17.3–21.2 s   |
| Boot, install, types                                             | 21–25 s       |
| Run and re-run                                                   | 28–31 s       |
| Type error skip                                                  | 30–34 s       |
| `pnpm add`                                                       | 36–37 s       |
| Legacy share                                                     | 17 s          |
| Stop and Restart                                                 | 31–33 s       |

### Verification

- `vp install`: ok.
- `astro check` (apps/web): 0 errors.
- `vp lint`: clean.
- `vp fmt --check`: the changed files are formatted. The 36 files it reports were already unformatted (`.agents/skills/**`, older `.scratch/**`).
- `vp test run apps/web/test/features packages/tsrs-lsp-wasm`: 52 files, 591 passed, 2 skipped.
- `playwright.scratchpad-worker.config.ts`: 10 of 10 pass in 1.7 minutes (7 worker and 3 share tests; the smoke test moved out).
- `playwright.scratchpad-container.config.ts`: 6 of 6 pass in each of three runs.
