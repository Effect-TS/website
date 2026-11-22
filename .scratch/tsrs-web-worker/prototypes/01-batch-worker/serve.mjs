// Static server for the harness. Serves .scratch/tsrs-web-worker/ (so /prototypes/... and /artifacts/... resolve),
// with COOP/COEP (crossOriginIsolated, needed for performance.measureUserAgentSpecificMemory), application/wasm for
// streaming compilation, and the precompressed .br/.gz sibling when the client accepts it.
// Usage: node serve.mjs [port]   (or import { serve } from "./serve.mjs")
import fs from "node:fs"
import http from "node:http"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".wasm": "application/wasm",
  ".json": "application/json",
  ".bin": "application/octet-stream",
}

export function serve(port = 0) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://x")
    const file = path.join(root, decodeURIComponent(url.pathname))
    if (
      !file.startsWith(root + path.sep) ||
      !fs.existsSync(file) ||
      fs.statSync(file).isDirectory()
    ) {
      res.writeHead(404).end("not found")
      return
    }
    const headers = {
      "content-type": types[path.extname(file)] ?? "application/octet-stream",
      "cross-origin-opener-policy": "same-origin",
      "cross-origin-embedder-policy": "require-corp",
      "cache-control": "no-store",
    }
    const accept = String(req.headers["accept-encoding"] ?? "")
    let send = file
    if (accept.includes("br") && fs.existsSync(file + ".br")) {
      send = file + ".br"
      headers["content-encoding"] = "br"
    } else if (accept.includes("gzip") && fs.existsSync(file + ".gz")) {
      send = file + ".gz"
      headers["content-encoding"] = "gzip"
    }
    headers["content-length"] = fs.statSync(send).size
    res.writeHead(200, headers)
    fs.createReadStream(send).pipe(res)
  })
  return new Promise((resolve) =>
    server.listen(port, "127.0.0.1", () => resolve(server)),
  )
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = await serve(Number(process.argv[2] ?? 8418))
  console.log(
    `http://127.0.0.1:${server.address().port}/prototypes/01-batch-worker/index.html`,
  )
}
