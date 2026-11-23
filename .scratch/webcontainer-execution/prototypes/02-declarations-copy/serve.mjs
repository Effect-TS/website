// node serve.mjs [port]  -> serves out/ with COOP same-origin + COEP require-corp
import * as http from "node:http"
import * as fs from "node:fs"
import * as path from "node:path"
const out = path.join(path.dirname(new URL(import.meta.url).pathname), "out")
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".cjs": "text/plain",
  ".wasm": "application/wasm",
}
const port = Number(process.argv[2] ?? 5182)
http
  .createServer((req, res) => {
    const url = new URL(req.url, "http://x")
    const file = path.join(
      out,
      url.pathname === "/" ? "index.html" : url.pathname,
    )
    if (!file.startsWith(out) || !fs.existsSync(file)) {
      res.writeHead(404).end()
      return
    }
    res.writeHead(200, {
      "content-type": types[path.extname(file)] ?? "application/octet-stream",
      "cross-origin-opener-policy": "same-origin",
      "cross-origin-embedder-policy": "require-corp",
      "cross-origin-resource-policy": "same-origin",
      "cache-control": "no-store",
    })
    fs.createReadStream(file).pipe(res)
  })
  .listen(port, "127.0.0.1", () => console.log(`http://localhost:${port}`))
