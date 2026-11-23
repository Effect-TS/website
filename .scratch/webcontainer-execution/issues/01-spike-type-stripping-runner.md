# 01: Spike: Node type-stripping runner in a real Container

Type: prototype
Status: resolved
Spec: ../spec.md

Find out whether `node src/main.ts` with Node 24 type stripping can run Scratchpad Workspaces inside a real WebContainer. Answer under `## Answer` with a recommendation: type stripping, or the fallback `tsc` emit then `node`.

- [x] Confirm the Container's Node version and that type stripping is on by default, or which flag turns it on
- [x] Write a resolve hook (`module.register` / `--import`) that maps relative `./x.js` imports to `./x.ts` when the `.js` file does not exist, and run a legacy Playground workspace that uses `.js` imports
- [x] Check whether enums, namespaces or parameter properties are needed (`--experimental-transform-types`), using the v4 template and a few legacy shares
- [x] Check that stack traces point at the right `.ts` lines, with and without `--enable-source-maps`
- [x] Check whether `process.title` being `undefined` (webcontainer-core#2184) breaks `@effect/platform-node`
- [x] Measure the time from an edit to the first output line, compared with `tsc` emit then `node`
- [x] Check that killing and restarting the process releases cleanly with no orphaned children

## Answer

All evidence below comes from a real WebContainer (`@webcontainer/api` 1.6.4) booted in headless Chromium via Playwright on 2026-11-23, with a page served under COOP `same-origin` / COEP `require-corp` (`crossOriginIsolated: true`). Harness, fixtures and raw output: `prototypes/01-type-stripping-runner/` (`drive.mjs`, `probe.mjs`, `probe-barrel.mjs`, `results*.json`). Installed: effect 4.1.5, @effect/platform-node 4.1.5, typescript 6.0.2, @types/node 26.6.6.

**Recommendation: use type stripping.** It runs the v4 template, legacy `.js`-import shares, and errors, and it reaches first output about 4.4 s sooner than `tsc` emit then `node` (median 6.2 s vs 10.6 s). The `tsc` fallback is not needed. Use the synchronous in-thread hook (`module.registerHooks`), not `module.register`, which costs about 2.8 s more per Run in the Container. Leave `--experimental-transform-types` off by default (see the enum finding).

Runner command (cwd = Workspace root):

```sh
node --import <abs path>/runner-preload.mjs src/main.ts
```

`prototypes/01-type-stripping-runner/container/runner-preload.mjs`:

```js
import { registerHooks } from "node:module"
import { existsSync } from "node:fs"

process.title ??= "node" // webcontainer-core#2184; harmless insurance

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (
      /^\.\.?\//.test(specifier) &&
      /\.[cm]?js$/.test(specifier) &&
      context.parentURL?.startsWith("file:")
    ) {
      const js = new URL(specifier, context.parentURL)
      if (!existsSync(js)) {
        const ts = new URL(specifier.replace(/js$/, "ts"), context.parentURL)
        if (existsSync(ts)) return nextResolve(ts.href, context)
      }
    }
    return nextResolve(specifier, context)
  },
})
```

The harness passed the preload as a relative path (`./runner-preload.mjs`) that sat in the Workspace directory. The real service should write it outside the mirrored Workspace and pass an absolute path. The absolute path itself was not tested; Node accepts one, so it is not expected to fail.

### Checklist findings

- **Node version and stripping.** `node --version` is `v24.22.2`. `process.features.typescript` is `"strip"`, so stripping is on by default and needs no flag. There is no ExperimentalWarning for stripping. `pnpm --version` is 8.15.6.
- **Resolve hook.** Without the hook, the v4 template itself fails, not only legacy shares: `src/main.ts` imports `./DevTools.js`, which gives `ERR_MODULE_NOT_FOUND`. With the hook, the v4 template and a legacy fixture (`.js` imports across files, including `../util.js` from a subdirectory, plus an `import type`) both run. Both `registerHooks` and the off-thread `module.register` hook work in the Container.
- **Enums, namespaces, parameter properties.** Strip-only mode rejects them with `SyntaxError [ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX]: TypeScript enum is not supported in strip-only mode`. `--experimental-transform-types` runs them, but it costs about 0.9 s per Run (median 7.36 s vs 6.44 s) and prints an ExperimentalWarning (silence it with `--disable-warning=ExperimentalWarning`). The v4 template doesn't need it. Suggestion: run strip-only, and if the output contains `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`, rerun once with transform-types and keep that flag for the Workspace. Always passing the flag is the simpler alternative.
- **Stack traces.** Line numbers are wrong in the Container under every runner. Columns are right under stripping. Examples:
  - A `throw` on line 12 (col 9) reports `main.ts:21:9` with stripping and `main.ts:16:11` with transform-types.
  - Under `tsc` emit, the same throw reports `dist/.../main.js:13:11`. That is emitted JS line 4 plus 9, in the `.js` file, even with `--enable-source-maps` and `.map` files present.
  - The offset is not constant. It was +9 for a file with no imports and +11 or +13 for files with imports. It appears to come from WebContainer's own module rewrite, which runs code through `eval` in the browser.
  - `--enable-source-maps` sets `process.sourceMapsEnabled = true` but changes nothing. The same trace runs locally on Node 24.22.3 show the correct `main.ts:12:9`.
  - Stripping is still the better option: right file, right column, line off by roughly 10. `tsc` gives the wrong file and the wrong line.
  - This can't be fixed in the runner. Ticket 09 should not promise clickable line links.
- **`process.title`.** It is `undefined` in the Container, as reported. With @effect/platform-node 4.1.5, `NodeRuntime.runMain` works without the preload. Nothing in the installed `node_modules` reads `process.title` at runtime (grep found only `@types/node` declarations). The `??=` line stays as cheap insurance.
- **Edit to first output.** See the table below.
- **Kill and restart.** `process.kill()` on the spawned `node` returns exit 143 within 6–11 ms. `ps` (from `/bin/ps` in jsh) during the Run shows the parent `node`, its `child_process.spawn`ed child `node`, and a `zsh` wrapper that WebContainer adds per spawn. After the kill, all three are gone. The same holds when the Run is wrapped in `jsh -c` (the Playground pattern). Two kill-then-restart cycles left no orphans. Not tested: `detached: true` children.

### Measurements (real Container, headless Chromium, ms)

| What                                                                                    | n   | min   | median    | max   |
| --------------------------------------------------------------------------------------- | --- | ----- | --------- | ----- |
| `WebContainer.boot()`                                                                   | 1   | 2858  | 2858      | 2858  |
| `pnpm install` (15 packages, fresh Container each time)                                 | 3   | 6496  | 6947      | 9383  |
| `node -e "console.log('hi')"` spawn to output                                           | 1   | 732   | 732       | 732   |
| **Edit → first output, stripping + sync hook** (pass 1)                                 | 6   | 5996  | **6185**  | 6354  |
| **Edit → first output, `tsc -p` (noCheck) then `node`**                                 | 6   | 9963  | **10606** | 10876 |
| Edit → first output, `tsc -p` with type check then `node`                               | 6   | 10472 | 10877     | 11516 |
| Edit → first output, stripping + sync `registerHooks` (pass 2)                          | 4   | 6365  | 6435      | 6816  |
| Edit → first output, stripping + async `module.register`                                | 4   | 8787  | 9427      | 10155 |
| Edit → first output, stripping + `--experimental-transform-types`                       | 4   | 6907  | 7360      | 7544  |
| Edit → first output, stripping + `--enable-source-maps`                                 | 4   | 6989  | 7378      | 7410  |
| Spawn → first output, v4 template as-is                                                 | 3   | 6633  | 6684      | 7314  |
| Spawn → first output, v4 template, DevTools.ts using `@effect/platform-node/NodeSocket` | 3   | 4169  | 4391      | 4458  |

"Edit" means `fs.writeFile` of `src/main.ts` from the page, through to the first output chunk containing the edited log message. The `tsc` rows use `tsconfig.emit.json` (extends the Workspace tsconfig, `outDir: dist`, `sourceMap`, `skipLibCheck`) and include the `tsc` process start, which is about 4–4.7 s.

### Surprises

- **Type-only imports without `type` break under stripping.** `import { Name, shout } from "./util.js"`, where `Name` is a type, fails at runtime with `SyntaxError: The requested module ... does not provide an export named 'Name'`. `tsc` elides it, so legacy shares written for `tsc` can hit this. Fix: add `"verbatimModuleSyntax": true` to the Workspace `tsconfig.json`, so tsrs reports TS1484 as an error and the Run is blocked with a diagnostic that has a quick fix. Also inject it into legacy tsconfigs (ticket 11). Without it, these Workspaces show no editor error and crash at Run time. `"erasableSyntaxOnly": true` would likewise surface enums in the editor, if the auto-retry with transform-types is not wanted.
- **The v4 template is slow to start because `DevTools.ts` imports the `@effect/platform-node` barrel.** That loads undici, ws and redis. Importing `@effect/platform-node/NodeSocket` instead cuts first output from about 6.7 s to 4.4 s. The seed template should change (ticket 11).
- **The devtools connection works inside the Container** when a TCP sink listens on 34437 there (`container/dev-tools-proxy.cjs`, same as the Playground's). The v4 template sends its NDJSON frames. Without a listener, the Run still finishes; the socket layer simply fails to connect.
- `@types/node` `latest` resolved to 26.6.6, while the Container runs Node 24. Consider pinning `@types/node@24` in the seed.
