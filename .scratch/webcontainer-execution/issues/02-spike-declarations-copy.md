# 02: Spike: copy installed declarations from the Container into the tsrs worker

Type: prototype
Status: resolved
Spec: ../spec.md

Find out the fastest reliable way to get `package.json` and `*.d.ts` files from the Container's pnpm `node_modules` into the tsrs worker's in-memory file system. Answer under `## Answer` with a chosen mechanism and measured numbers.

- [x] Measure a naive approach: walk `node_modules/.pnpm/*/node_modules/**` and run `fs.readFile` per file, as the Playground's type acquisition does
- [x] Measure an in-container script that packs every matching file into one archive or JSON blob, read out with one `readFile`
- [x] Measure `export(dir, { format, includes })`, and check whether it silently drops large unread files (webcontainer-core#2180)
- [x] Decide how pnpm symlinks are flattened so tsrs resolves `effect`, `@effect/platform-node` and `@types/node` under `/workspace/node_modules`
- [x] Check that tsrs diagnostics are clean for the v4 template after the copy, and record the file count, bytes and time in Chromium, Firefox and WebKit
- [x] Sketch the bulk `WorkspaceFsOp` that the worker protocol needs

## Answer

**Use an in-container collector script (B).** After each install, the host writes a small CommonJS script into the Container and runs `node` on it. The script flattens pnpm's layout, packs every `package.json` and `*.d.{ts,mts,cts}` into one TSPK types pack (the existing `packages/tsrs-lsp-wasm/src/TypesPack.ts` format), and writes it to a file. The host reads the pack with one `wc.fs.readFile`, transfers the `ArrayBuffer` to the tsrs worker, and the worker swaps `/workspace/node_modules` for the pack with `mountTypesPack`. B is the only approach that is both fast and complete as the dependency graph grows. It also reuses the existing pack decoder, which mounts zero-copy views.

Everything below ran against a real WebContainer (`@webcontainer/api` 1.6.4, pnpm 8.15.6 in the Container, workdir `/home/playground-v4`). It used the Playground v4 template dependencies, the real `packages/tsrs-lsp-wasm` host, and `dist/tsrs-effect-lsp.wasm`, in headless Chromium 153, Firefox 155 and WebKit (Playwright builds on Linux, not Safari). The harness is in `../prototypes/02-declarations-copy/`.

### Measurements

There are two dependency sets. The **template** is `effect`, `@effect/platform-node`, `@types/node` and `typescript@6.0.2`: `latest` resolved to effect 4.1.5, giving 15 packages, 1,684 files and 22.2 MB. The **heavy** set is the template plus `date-fns`, `rxjs`, `zod` and `@aws-sdk/client-s3`, standing in for a visitor's `pnpm add`: 44 packages, 6,838 files and 29.4 MB. Chromium template figures are the range over 3 runs. The other rows are single runs.

| Run                | `pnpm install` | A: per-file walk | B: script + 1 `readFile` (all / no TS libs) | C: `export()` json + flatten                | Pack → tsrs, no errors |
| ------------------ | -------------- | ---------------- | ------------------------------------------- | ------------------------------------------- | ---------------------- |
| Chromium, template | 6.3–7.3 s      | 1.48–1.67 s      | 1.01–1.16 s / 0.87–0.89 s                   | 0.44–0.46 + 0.17–0.20 s, **1 file missing** | 1.09–1.32 s            |
| Firefox, template  | 9.0 s          | 1.53 s           | 1.34 s / 0.98 s                             | 0.70 + 0.08 s, **1 missing**                | 1.28 s                 |
| WebKit, template   | 7.2 s          | 1.32 s           | 1.12 s / 1.02 s                             | 0.42 + 0.21 s, **1 missing**                | 1.09 s                 |
| Chromium, heavy    | 6.2 s          | **12.54 s**      | 1.42 s / 1.43 s                             | 0.78 + 0.31 s, **1 missing**                | 1.39 s                 |
| Firefox, heavy     | 10.6 s         | **10.74 s**      | 2.04 s / 1.57 s                             | 1.21 + 0.18 s, **1 missing**                | 1.03 s                 |
| WebKit, heavy      | 8.8 s          | **8.65 s**       | 1.81 s / 1.45 s                             | 0.64 + 0.36 s, **1 missing**                | 1.05 s                 |

- **A** made 348 `readdir` calls and 1,684 `readFile` calls on the template, and 1,519 and 6,838 on the heavy set. Four times the files cost 6 to 8 times the wall time. It found the same 1,684 files as B, byte for byte.
- **B** splits into the `node` spawn plus the script, then the read. On the template in Chromium, spawn plus script took 0.89–1.03 s, of which the script itself took 0.31–0.35 s, so starting Node in the Container costs about 0.6 s. Reading the 22 MB pack took 0.11–0.14 s in Chromium, 0.31 s in Firefox and 0.03 s in WebKit. "No TS libs" skips `typescript/lib/lib.*.d.ts`, which is 107 files and 3.8 MB. tsrs bundles its own lib files, so it never reads those. The heavy-set pack is 26.1 MB.
- **C** returns its tree in 0.4–1.2 s, but it is not reliable. See "export() findings" below.
- **Pack → tsrs, no errors** is the time from the page's `postMessage` (pack transferred) to the end of a diagnostics pull on both template files. That covers removing `node_modules`, mounting the pack (15–62 ms), the host's single coalesced `workspace/didChangeWatchedFiles` with 1.6k–6.7k entries, and the pull (0.97–1.29 s, mostly building the program against the new types). A second copy of the same pack, as after a reinstall, took 0.27–0.71 s. Host memory after the mount was 275 MB in all three engines.
- The tsrs host started in 0.33–0.86 s and was running before the install finished, with 2307 "Cannot find module" errors as expected. Diagnostics must stay hidden until the first copy lands, as the spec says.

**End-to-end budget for B after `pnpm install` exits:** about 2 to 2.5 s until clean diagnostics in Chromium, and about 2.5 to 3.3 s on the heavy set in Firefox.

### Diagnostics after the copy

I tested with the template's `tsconfig.json` (NodeNext, `include: ["src"]`, no `types` field, so `@types/*` load automatically) plus the `@effect/language-service` plugin entry. In all three engines, with B, A and C (C's missing file is not one tsrs needs), the template had zero errors:

- `src/main.ts`: hint 377017 `unnecessaryEffectGen` (line 5) and warning 377136 `unstableApiUsage` on `NodeRuntime.runMain`.
- `src/DevTools.ts`: two 377136 `unstableApiUsage` warnings (`DevTools.layerSocket`, `NodeSocket.layerNet`).
- Hover resolves `@effect/platform-node/NodeRuntime` and `@effect/platform-node/NodeSocket`.
- A probe file importing `node:fs`, `node:buffer`, `effect/Schema` and `@effect/platform-node/NodeHttpServer` had no 2307 errors. Its deliberate `const x: number = "…"` produced exactly one 2322, which shows the checker was really running.

### How pnpm symlinks are flattened

The tsrs `MemoryFileSystem` has no symlinks, so each package name gets exactly one real directory, copied to `/workspace/node_modules/<name>/…`:

1. First, `realpath(node_modules/<name>)`, the links pnpm creates for direct dependencies.
2. Then, for every other name, `realpath(node_modules/.pnpm/node_modules/<name>)`. This is pnpm's hidden hoist directory (default `hoist-pattern: *`), where pnpm has already chosen one version per name for the whole graph. pnpm 8.15.6 in the Container creates it. That is how B found the 11 transitive packages in the template (`@effect/platform-node-shared`, `undici-types`, `@types/ws`, `redis`, `@redis/*`, …).
3. Inside each package, nested `node_modules` directories are skipped.

The script reports store packages that neither link reaches, meaning other versions of a hoisted name, under `dropped`. Both test sets had no duplicate versions, so `dropped` was empty. On this repo's own large pnpm tree, the same script dropped 116. If that ever matters (for example two majors of a package that `effect` types depend on), the fix is to also write each dropped version under `node_modules/<dependent>/node_modules/<name>` for the dependents whose `.pnpm/<id>/node_modules/<name>` link points at it. That is not needed for v4 workspaces.

This rule needs `realpath`, and only an in-container script has it. `wc.fs` has no `readlink` or `realpath`, and `readdir` reports a symlink as neither a file nor a directory: A saw 18 such entries. So A cannot see which version pnpm hoisted. The Playground's walk writes every store package to the same key, and the last write wins in whatever order the concurrent reads finish.

### Bulk op for the worker protocol

```ts
// worker-protocol.ts
export type WorkspaceFsOp =
  | { readonly _tag: "Reset"; readonly files: Readonly<Record<string, string>> }
  | {
      readonly _tag: "WriteFile"
      readonly path: string
      readonly content: string
    }
  | { readonly _tag: "Remove"; readonly path: string }
  | { readonly _tag: "Rename"; readonly from: string; readonly to: string }
  | {
      /**
       * Replaces everything below /workspace/node_modules with a TSPK types pack
       * (packages/tsrs-lsp-wasm/src/TypesPack.ts; paths are `<name>/<path in package>`).
       * Posted with `pack` in the transfer list; the worker mounts zero-copy views of it.
       */
      readonly _tag: "ReplaceNodeModules"
      readonly pack: ArrayBuffer
    }

export type WorkerToPage =
  | /* existing */ { readonly _tag: "Progress" /* ... */ }
  | {
      /** The page unhides diagnostics on the first one. */
      readonly _tag: "TypesMounted"
      readonly files: number
      readonly bytes: number
      readonly packages: ReadonlyArray<{
        readonly name: string
        readonly version: string
      }>
    }
  | { readonly _tag: "TypesRejected"; readonly message: string } // TypesPackError
```

In `lsp-worker-bridge.ts` `applyFsOp`: `fs.remove(rootPath + "/node_modules")`, then `mountTypesPack(fs, op.pack)`, then `markOthersDirty(undefined)`. Both steps run synchronously, so the host's watcher reports them in one `didChangeWatchedFiles` flush, where its coalescing turns a delete followed by a create into a change. The op also works before `connect`, because the host is created over the same `fs`. `Reset` already leaves `node_modules` alone (`isWorkspaceFile`). The `Fs` message needs a transfer list in `worker-transport.ts` (`worker.postMessage(message, [op.pack])`). The pack is 18–26 MB, so copying it would double memory for a moment.

On the Container side, the collector ships as a string constant in the app. The host writes it and its output to a dot directory that is not a Workspace path (`.scratchpad/collect-types.cjs`, `.scratchpad/types.pack`), runs `node .scratchpad/collect-types.cjs node_modules .scratchpad/types.pack --skip-ts-libs`, reads the pack, and deletes it. The spike's script is `../prototypes/02-declarations-copy/src/collect.cjs`. It is about 120 lines with no dependencies.

### export() findings (C)

- **webcontainer-core#2180 reproduces in all three engines, silently.** A fresh `export("node_modules", { format: "json", includes })` dropped `typescript/lib/lib.dom.d.ts` (2,349,483 B) every time. The same call after A and B had read every file included it. It did _not_ drop `@redis/client/dist/lib/commands/index.d.ts` (1,077,780 B), so the cutoff is not simply 1 MB. tsrs doesn't need `lib.dom.d.ts`, but a large declaration file in a visitor's dependency would be lost the same way.
- **The JSON tree contains no symlinks.** The export returned 0 symlink entries, so `node_modules/<name>` and `.pnpm/node_modules/<name>` disappear. Flattening C's output means guessing versions from the store (the spike borrowed B's choices to compare) or parsing `.modules.yaml`.
- `includes` on its own works as a filter (types only: 1,683 files). `excludes: ["**"]` plus the same `includes` returns an empty tree, so `includes` does not re-include files under an excluded glob.

### Surprises

- **`pnpm install -E` fails in the Container:** `ERROR Unknown option: 'save-exact'` (pnpm 8.15.6). The spec and ADR 0004 both say "run `pnpm install -E`". The Playground actually runs plain `pnpm install`. Ticket 08 needs another way to pin `package.json`, for example rewriting the ranges from `pnpm-lock.yaml` (`importers['.'].dependencies`), or `pnpm add -E <names>` (`add` does accept `--save-exact`).
- The pristine v4 template shows three `unstableApiUsage` warnings and one `unnecessaryEffectGen` hint. They don't block a Run, but every first visit sees them.
- `@effect/platform-node@4.1.5` pulls in `redis` and five `@redis/*` packages, 2.6 MB of declarations, so the template copy is 15 packages rather than the 4 it names.
- About 0.6 s of B's time goes to starting `node` in the Container. On the template, A is only 0.3–0.6 s slower than B. The gap becomes 6 to 9× once a visitor adds a few packages.
- Firefox and WebKit from `~/.cache/ms-playwright` would not launch: Firefox 1543 was missing, and the old 1532 build lacked `libgtk-3.so.0`. The flake's `playwright-driver.browsers` (firefox-1543, webkit-2359) worked. WebKit also needed Mesa software GL (`LIBGL_ALWAYS_SOFTWARE=1`, `__EGL_VENDOR_LIBRARY_FILENAMES=<mesa>/share/glvnd/egl_vendor.d/50_mesa.json`).

### Reproduce

From `../prototypes/02-declarations-copy/`:

```sh
node build.mjs            # esbuild page + worker into out/, copies dist/tsrs-effect-lsp.wasm
node serve.mjs &          # :5182 with COOP same-origin + COEP require-corp
node run.mjs chromium     # QUERY=heavy for the larger set; results/<browser>[-query].json
PLAYWRIGHT_BROWSERS_PATH=<nix develop's path> node run.mjs firefox   # webkit also needs the Mesa env above
node summarize.mjs
```

The raw results from the runs above are in `results/`. `out/` was deleted, because it holds a 14 MB copy of the wasm module.
