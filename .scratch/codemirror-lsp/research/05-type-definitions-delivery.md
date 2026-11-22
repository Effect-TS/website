# Type definition delivery for Effect and other packages

Research for ticket [05-type-definitions-delivery](../issues/05-type-definitions-delivery.md).

## Recommendation

If the CodeMirror editor runs in a browser Web Worker, build first-party static type packs at site build time from the pinned versions in `pnpm-workspace.yaml`. Ship one core pack containing the needed `typescript` `lib.*.d.ts` closure plus `effect@4.1.2`, and ship small on-demand add-on packs for companion packages like `@effect/platform-node`, `@effect/atom-react`, and `@types/node`. Cache them in the Cache API or IndexedDB, not `localStorage`.

If the editor uses a remote LSP server, pre-install the curated Effect packages into a single hoisted, read-only parent `node_modules` directory per Effect major version, and place per-session scratch folders underneath it. Do not copy `node_modules` per session, and avoid symlinking `node_modules` into session directories if using `tsgo --lsp`.

## Existing Monaco playground

The existing playground in `apps/web/src/features/playground` does not pre-bundle `.d.ts` files for `effect`. It splits type delivery across two mechanisms:

1. **TypeScript standard library (`lib.*.d.ts`).** `apps/web/astro.config.ts` loads `monacoEditorPlugin` from `apps/web/src/features/playground/plugins/monaco-editor.ts`, which bundles `@effect/monaco-editor` (`^0.0.3` in `pnpm-workspace.yaml`) with `languages: ["typescript", "javascript", "json", "css", "html"]` and `features: "all"`. As noted in `apps/web/src/features/playground/services/monaco.ts:12`, Monaco embeds TypeScript 5.6 inside `ts.worker.js`, which inlines the compiler and the `lib.*.d.ts` map as JavaScript. Standard `monaco-editor` `ts.worker.js` builds run about 6 to 7.8 MB minified, or 0.9 to 1.5 MB gzipped, before counting Monaco's editor core and the other language workers.
2. **Effect and npm package types.** `apps/web/src/pages/play.astro:10-11` sets `Cross-Origin-Embedder-Policy: require-corp` and `Cross-Origin-Opener-Policy: same-origin` so `@webcontainer/api` can boot. In `apps/web/src/features/playground/domain/workspace.ts:551-585`, the default v4 workspace sets `prepare` to:

   ```text
   pnpm install -E @effect/platform-node@latest effect@latest @types/node@latest typescript@6.0.2
   ```

   On load, `apps/web/src/features/playground/atoms/workspace.ts:150-168` spawns that command inside WebContainer's `jsh` shell against the live npm registry. After `pnpm install` exits, `setupWorkspaceTypeAcquisition` in `apps/web/src/features/playground/atoms/workspace.ts:317-458` walks `/node_modules/.pnpm` concurrently, reads every `package.json` and `*.d.ts` file from non-symlinked package directories, strips the `.pnpm/<content-address>` prefix so paths resolve as `file:///node_modules/<pkg>/...`, and registers them via `monaco.languages.typescript.typescriptDefaults.addExtraLib` through `ExtraLibRegistry` in `apps/web/src/features/playground/services/typescript-project.ts`. It also registers the workspace `package.json` via `setupWorkspaceProjectMetadata` and watches `package.json` so running `pnpm install <pkg>` in the terminal refreshes the registered types.

This architecture makes sense when you already need WebContainer to execute Node code, because `pnpm install` has to happen anyway. For a fast-loading, non-executing CodeMirror editor, it carries four costs we do not want:

- Booting WebContainer and running live `pnpm install` downloads full runtime JS, source maps, and a second copy of TypeScript (`typescript@6.0.2` for `runExe` in `apps/web/src/features/playground/services/webcontainer.ts:1154`).
- Requiring COOP and COEP headers complicates embedding the editor on arbitrary docs and blog pages that load third-party embeds or media.
- Editor intellisense and runtime execution run different TypeScript versions, 5.6 in Monaco versus 6.0.2 in WebContainer.
- Cold startup waits on both `ts.worker.js` and a live npm install before `effect` types appear.

## Browser Web Worker route

### Mounting `.d.ts` files in `vtsls` vs `@typescript/vfs`

Both browser worker approaches keep all `.d.ts` files in an in-memory map, because a Web Worker has no local filesystem:

- **`@typescript/vfs`** builds a `Map<string, string>` (`fsMap`), wraps it in `createSystem(fsMap)` and `createVirtualTypeScriptEnvironment(system, rootFiles, ts, compilerOptions)`, and exposes `ts.LanguageService` directly. Any file placed at `/node_modules/effect/package.json` and `/node_modules/effect/dist/...d.ts` resolves through TypeScript's normal `node_modules` and `exports` resolution. Because `@typescript/vfs` does not speak LSP on its own, the worker must include a thin JSON-RPC/LSP bridge over `ts.LanguageService`.
- **`vtsls` in a Web Worker** (as in `andy0130tw/codemirror-lsp-client-demo`) already speaks LSP, so `@codemirror/lsp-client` talks to it without a custom adapter. Because `vtsls` wraps VS Code's TypeScript extension and `tsserver`, which expect Node `fs`, running it in a browser requires patching `vtsls` and `tsserver` onto an in-memory virtual filesystem shim and populating that VFS with `tsconfig.json`, `lib.*.d.ts`, and `/node_modules/<pkg>/*.d.ts`.

Either way, the delivery problem is identical: getting `lib.*.d.ts`, `package.json`, and `*.d.ts` files into the worker's in-memory map fast.

### Packaging, fetching, and caching options

There are two ways to populate the worker VFS:

1. **Build-time static type packs (recommended).** At Astro/Vite build time, a small script reads `package.json` and `**/*.d.ts` from `node_modules/effect` and the required `lib.*.d.ts` closure from `node_modules/typescript/lib`, drops `.d.ts.map` and JS files, and writes a content-hashed JSON map (or zip via `@zip.js/zip.js`, already in `apps/web/package.json`) into `public/`. Cloudflare serves the asset compressed with Brotli/gzip and `Cache-Control: public, max-age=31536000, immutable`. The worker fetches one file, stores the parsed or raw response in the Cache API or IndexedDB, and loads all entries into the VFS `Map` in one pass.
   - Note on `localStorage`: `@typescript/vfs`'s built-in `createDefaultMapFromCDN(..., true, ts)` caches in `localStorage`, which has two problems here. `localStorage` is unavailable inside a Web Worker, and its ~5 MB UTF-16 quota fills quickly once you store both `lib.*.d.ts` and `effect`. Use the Cache API or IndexedDB inside the worker instead.
2. **Runtime CDN fetch via `@typescript/vfs` + `@typescript/ata`.** `createDefaultMapFromCDN` pulls `lib.*.d.ts` files from jsDelivr, and `@typescript/ata` parses `import` statements, queries `data.jsdelivr.com/v1/package/npm/<pkg>@<ver>` for the file tree, and fetches each `.d.ts` file from `cdn.jsdelivr.net`. This works well for arbitrary third-party packages, but it is a poor primary path for `effect@4.1.2`. Effect v4 folds core, schema, platform, rpc, sql, and ai into one package with hundreds of subpath `.d.ts` files. Fetching them one by one over a third-party CDN creates a request waterfall on cold start and makes docs type-checking fail whenever jsDelivr hiccups.

### Payload size and startup impact

**Measurement note:** `node_modules` is not installed in this worktree, so exact local byte counts for `node_modules/effect@4.1.2` and `node_modules/typescript@6.0.3/lib/lib.*.d.ts` remain unmeasured here. Once `pnpm install` has been run in a checkout, lock in exact numbers with:

```bash
node -e '
const fs = require("fs"), path = require("path"), zlib = require("zlib");
function measure(dir, pred) {
  let files = 0, raw = 0, chunks = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (pred(p, e.name)) {
        const b = fs.readFileSync(p);
        files++; raw += b.length; chunks.push(b);
      }
    }
  })(dir);
  const gz = zlib.gzipSync(Buffer.concat(chunks), { level: 9 }).length;
  const br = zlib.brotliCompressSync(Buffer.concat(chunks)).length;
  console.log({ dir, files, rawKB: +(raw/1024).toFixed(1), gzKB: +(gz/1024).toFixed(1), brKB: +(br/1024).toFixed(1) });
}
measure("node_modules/typescript/lib", (p, n) => /^lib\..*\.d\.ts$/.test(n));
measure("node_modules/effect", (p, n) => n === "package.json" || n.endsWith(".d.ts"));
'
```

What we know from primary sources right now:

- **TypeScript 6.0 `lib.*.d.ts`:** The TypeScript 6.0 package ships 102 `lib.*.d.ts` files ranging from ~1 KB up to ~1.8 MB. `lib.dom.d.ts` alone is ~838 KB raw (~20,166 lines), and in TypeScript 6.0 `lib.dom.iterable.d.ts` and `lib.dom.asynciterable.d.ts` were merged into `lib.dom.d.ts` (leaving empty stubs for backwards compatibility). You do not need to ship all 102 files. Shipping only the `/// <reference lib="..." />` closure for `"target": "ESNext"` plus `"lib": ["ES2022", "DOM"]` or `["ESNext", "DOM"]` cuts out WebWorker, ScriptHost, and legacy duplicate targets.
- **`effect@4.1.2`:** Effect v4 consolidated formerly separate packages (`schema`, `platform`, `rpc`, `sql`, `ai`, `reactivity`) under `effect`. Per Bundlephobia, the full minified JS for `effect@4.1.x` is ~868 KB (~267 KB gzipped). Declaration files contain heavy JSDoc and repeated type signatures, which compress aggressively under Brotli and gzip, typically 5x to 10x.
- **Compiler runtime in the worker:** Any browser TypeScript worker must also download the `typescript@6.0.3` compiler bundle (~1 to 1.5 MB gzipped, comparable to Monaco's `ts.worker.js`), though it skips Monaco's editor UI bundle and WebContainer completely.
- **Startup profile:** Fetching one compressed type pack and populating the VFS `Map` takes tens of milliseconds on a warm cache and a few hundred milliseconds cold. The dominant startup cost is TypeScript's initial `createProgram` and type-checking pass over Effect's conditional types, which runs off the main thread in the worker and typically takes 0.5 to 2 seconds depending on device speed.

## Server route

Because `apps/web` deploys to Cloudflare (`@alchemy.run/cloudflare`), a server-backed LSP requires a separate stateful Node or Go service running `tsgo --lsp --stdio` or `vtsls` behind WebSockets, similar to `val-town/vtlsp`.

### Sharing `node_modules` across sessions

Do not copy `node_modules` per session. Copying thousands of files per WebSocket connection burns disk I/O, inodes, and startup latency.

The cleanest server layout uses Node and TypeScript's standard upward directory resolution:

```text
/srv/workspaces/
  v4/
    node_modules/          # hoisted, read-only (chmod -R a-w), shared by all v4 sessions
    sessions/
      <session-id>/
        tsconfig.json
        src/
          main.ts
```

Why a read-only parent `node_modules` beats per-session symlinks:

- **Zero per-session setup cost.** Creating a session writes only a tiny `tsconfig.json` and the initial source file(s).
- **Avoids `tsgo` symlink bugs and memory bloat.** `typescript-go` (`tsgo --lsp`) issues have documented realpath resolution bugs and multi-gigabyte memory spikes when symlinked `node_modules` (such as pnpm virtual stores or per-session symlinks) cause the server to cache the same physical `.d.ts` files under multiple virtual paths, plus file-watcher exhaustion when watching across symlinks. Installing the shared template with hoisted dependencies (`npm install` or `pnpm --node-linker=hoisted`) and resolving it via parent-directory lookup avoids symlink chains completely.
- **Immutability and isolation.** Mounting `/srv/workspaces/v4/node_modules` read-only prevents any session from mutating shared types. If multiple sessions share one LSP process, the WebSocket proxy must validate all LSP file URIs so a client cannot open `../<other-session>/src/main.ts` or read host files.

## Multi-package examples

Effect v4 already reduces multi-package complexity compared to v3 because `effect@4.1.2` bundles core, schema, platform core, rpc, sql core, reactivity/Atom, and ai. Looking at `apps/web/package.json` and `pnpm-workspace.yaml`, the remaining ecosystem packages used on the website are:

- `@effect/platform-node@4.1.2` and `@types/node`
- `@effect/platform-browser@4.1.2`
- `@effect/sql-d1@4.1.2` and `@effect/sql-sqlite-do@4.1.2`
- `@effect/atom-react@4.1.2` and `@types/react`

How each route handles them:

| Aspect | Browser Web Worker route | Server route |
| --- | --- | --- |
| Curated Effect packages | Ship a base pack (`ts-libs` + `effect@4.1.2`) plus one small static JSON/zip add-on pack per companion package (`platform-node`, `atom-react`, `sql-d1`, `types-node`, `types-react`) generated from `pnpm-workspace.yaml`. Examples declare needed packages, or the worker scans imports and fetches add-on packs in parallel. | Pre-install all curated companion packages into the shared read-only parent `node_modules`. TypeScript only parses `.d.ts` files that the session imports, provided each session's `tsconfig.json` sets `"types": []` (or `"types": ["node"]` when needed) so ambient `@types/*` packages do not load unnecessarily. |
| Effect v3 vs v4 examples | Separate content-hashed base packs (`effect-v4.json`, `effect-v3.json`), selected per editor instance. | Separate read-only parent roots (`/srv/workspaces/v4/node_modules` and `/srv/workspaces/v3/node_modules`). |
| Arbitrary user-typed npm imports | Optional fallback to `@typescript/ata` over jsDelivr for package names not in the curated manifest. | Not practical without per-session sandboxed installs, which re-introduces WebContainer's latency and security exposure on your own servers. |

## Sources

- Repo files:
  - `apps/web/src/features/playground/atoms/workspace.ts` (`setupWorkspaceTypeAcquisition`, `setupWorkspaceProjectMetadata`)
  - `apps/web/src/features/playground/services/typescript-project.ts` (`ExtraLibRegistry`)
  - `apps/web/src/features/playground/services/monaco.ts` (embedded TS 5.6 note, compiler options)
  - `apps/web/src/features/playground/services/webcontainer.ts` (WebContainer boot, `runExe` using `node_modules/typescript`)
  - `apps/web/src/features/playground/domain/workspace.ts` (default v3/v4 `dependencies` and `pnpm install -E` prepare command)
  - `apps/web/src/features/playground/plugins/monaco-editor.ts` and `apps/web/astro.config.ts`
  - `apps/web/src/pages/play.astro` (COOP/COEP headers)
  - `pnpm-workspace.yaml` and `apps/web/package.json` (catalog versions: `effect@4.1.2`, `typescript@6.0.3`, `@effect/monaco-editor@^0.0.3`, `@effect/*@4.1.2`)
- External primary sources:
  - `@typescript/vfs` and `@typescript/ata` documentation (TypeScript website / npm)
  - `andy0130tw/codemirror-lsp-client-demo` (browser Web Worker `vtsls` + `@codemirror/lsp-client`)
  - `val-town/vtlsp` (remote LSP over WebSocket for CodeMirror)
  - TypeScript 6.0 release notes (`lib.dom.iterable.d.ts` merged into `lib.dom.d.ts`) and TypeScript `lib/*.d.ts` file inventory (102 files)
  - `microsoft/typescript-go` symlink and file-watcher issues (`tsgo --lsp` realpath caching and memory behavior)
  - `monaco-editor` `ts.worker.js` bundle size reports (~6 to 7.8 MB minified, ~0.9 to 1.5 MB gzipped)
