# Prototype bare CodeMirror 6 with @codemirror/lsp-client and vtsls worker

Type: prototype
Status: resolved
Blocked by: 01

## Question

Does a throwaway page in `apps/web` combining CodeMirror 6, `@codemirror/lsp-client`, and the vtsls Web Worker (wired without Effect) load cleanly in this repo's Astro/Vite setup and deliver completions, hover, and diagnostics?

Build the cheapest proof that the editor and worker run here, measure initial load/bundle weight against the existing Monaco playground, and note any Astro/Vite worker bundling quirks.

## Answer

Yes, it runs in `apps/web` and delivers diagnostics, hover, and completions, but browser `vtsls` is roughly twice as heavy as Monaco's static bundle and defeats the lightweight goal.

Archived throwaway prototype: branch `prototype/cm-lsp-vtsls` (commit `844de07b`; static `public/__proto-vtsls/tsserver.web.js` and TS 5.9.3 `lib*.d.ts` omitted from git).

### Verified behavior (Astro 7 dev + headless Chromium)

- LSP `initialize` completed in 65 ms (`crossOriginIsolated: true`).
- Push diagnostics (`textDocument/publishDiagnostics`) arrived in ~3.0 s (`L23 [2322]: Type 'string' is not assignable to type 'number'.`) and rendered via `@codemirror/lsp-client@6.3.1` `languageServerExtensions()` with no custom diagnostics bridge.
- Hover returned `function greet(u: User): string` in 42 ms warm.
- Completions on `user.` returned `["id", "name", "tags"]` in 127 ms.

### Production bundle weight (Vite/Rolldown, minified, React externalized)

- **CodeMirror 6 + `@codemirror/lsp-client` shell only:** 562.6 KB raw / 183.7 KB gzip (1 file, 7.6x smaller than Monaco's main bundle).
- **CodeMirror 6 + `lsp-client` + browser `vtsls` client:** 8,075.5 KB raw / 2,574.6 KB gzip (6,304.1 KB JS + 1,771.4 KB `node_maintainer_bg.wasm`).
- **`vtsls` static worker (`tsserver.web.js`):** 11,420.7 KB raw / 2,473.2 KB gzip, plus 3,068.2 KB raw / 474.1 KB gzip across 100 `lib*.d.ts` files fetched on demand.
- **Total CM6 + browser `vtsls` (excluding libs):** 19,496.2 KB raw / 5,047.8 KB gzip.
- **Existing Monaco `/play` static bundle:** 5,043.0 KB raw / 1,388.0 KB gzip main bundle + 5,875.1 KB raw / 1,306.4 KB gzip workers (`editor.worker` + `ts.worker`) = 10,918.1 KB raw / 2,694.4 KB gzip total (excluding runtime WebContainer boot and `pnpm install`).

### Astro / Vite / Rolldown quirks

1. `@andy0130tw/vtsls-language-service@0.3.0-dev-browser.0` imports `uuid` without declaring it in `dependencies`, failing under pnpm strict resolution unless `uuid` is installed in `apps/web`.
2. `@vscode/ts-package-manager` expects importing `node_maintainer_bg.wasm` to yield a base64 `data:` URI string, whereas Vite 8 / Rolldown treats `.wasm` as an ESM WebAssembly module and fails resolving `"wbg"`. Fixing it required a Vite `load` hook returning an inline base64 data URI.
3. Setting COOP/COEP only on the `.astro` route (as `play.astro` does) breaks `new Worker("/__proto-vtsls/tsserver.web.js")`. The static worker and `.d.ts` responses must also send `COEP: require-corp` and `CORP: same-origin`.
4. `@codemirror/lsp-client`'s default 3000 ms request timeout tripped on cold worker boot while `tsserver.web.js` loaded `lib*.d.ts`. Raising `timeout` to `10_000` resolved it.
5. On startup, `@vscode/ts-package-manager` attempts to fetch `types-registry` from `registry.npmjs.org`, which COEP blocks because npm does not send CORP headers.
