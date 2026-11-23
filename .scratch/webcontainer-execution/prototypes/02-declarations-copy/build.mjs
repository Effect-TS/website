// node build.mjs  -> out/{index.html,page.js,worker.js,collect.cjs,tsrs-effect-lsp.wasm}
import { build } from "../../../../node_modules/.pnpm/esbuild@0.28.2/node_modules/esbuild/lib/main.js"
import * as fs from "node:fs"
import * as path from "node:path"
const here = path.dirname(new URL(import.meta.url).pathname)
const repo = path.resolve(here, "../../../..")
const out = path.join(here, "out")
fs.mkdirSync(out, { recursive: true })
await build({
  entryPoints: {
    page: path.join(here, "src/page.ts"),
    worker: path.join(here, "src/worker.ts"),
  },
  bundle: true,
  format: "esm",
  target: "es2022",
  outdir: out,
  nodePaths: [path.join(repo, "apps/web/node_modules")],
  logLevel: "info",
})
fs.copyFileSync(
  path.join(here, "src/collect.cjs"),
  path.join(out, "collect.cjs"),
)
fs.copyFileSync(
  path.join(repo, "packages/tsrs-lsp-wasm/dist/tsrs-effect-lsp.wasm"),
  path.join(out, "tsrs-effect-lsp.wasm"),
)
fs.writeFileSync(
  path.join(out, "index.html"),
  `<!doctype html><meta charset="utf-8"><title>02 declarations copy</title><pre id="log"></pre><script type="module" src="/page.js"></script>`,
)
