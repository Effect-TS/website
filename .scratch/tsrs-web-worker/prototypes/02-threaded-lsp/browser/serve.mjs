// Static server for the browser harness, cross-origin isolated (COOP same-origin + COEP require-corp) so the page
// can use SharedArrayBuffer and shared WebAssembly.Memory.
//   node browser/serve.mjs <module.wasm> <workspaceDir> [port]
// Serves the host directory at /, the module at /tsrs.wasm, and the workspace packed as /fs.json + /fs.bin
// (mounted at /ws in the guest). Optional gzip/brotli: requests with ?enc=br or ?enc=gzip get a compressed body.
import { createServer } from "node:http"
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs"
import { join, extname, resolve } from "node:path"
import { brotliCompressSync, gzipSync, constants } from "node:zlib"

const [wasmPath, wsDir, port = "8765"] = process.argv.slice(2)
const hostDir = resolve(new URL("..", import.meta.url).pathname)
const files = []
const walk = (host, guest) => {
  for (const e of readdirSync(host)) {
    const p = join(host, e),
      g = guest + "/" + e
    if (statSync(p).isDirectory()) walk(p, g)
    else files.push([g, readFileSync(p)])
  }
}
walk(wsDir, "/ws")
let off = 0
const index = files.map(([p, b]) => {
  const r = [p, off, b.length]
  off += b.length
  return r
})
const fsBin = Buffer.concat(files.map(([, b]) => b))
const wasm = readFileSync(wasmPath)
const routes = {
  "/tsrs.wasm": [wasm, "application/wasm"],
  "/fs.bin": [fsBin, "application/octet-stream"],
  "/fs.json": [Buffer.from(JSON.stringify(index)), "application/json"],
}
const types = {
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".html": "text/html",
  ".ts": "text/plain",
}
const cache = new Map()
const compress = (key, buf, enc) => {
  const k = key + enc
  if (!cache.has(k))
    cache.set(
      k,
      enc === "br"
        ? brotliCompressSync(buf, {
            params: {
              [constants.BROTLI_PARAM_QUALITY]: 11,
              [constants.BROTLI_PARAM_SIZE_HINT]: buf.length,
            },
          })
        : gzipSync(buf, { level: 9 }),
    )
  return cache.get(k)
}
createServer((req, res) => {
  const url = new URL(req.url, "http://x")
  let body, type
  if (routes[url.pathname]) [body, type] = routes[url.pathname]
  else {
    const p = join(
      hostDir,
      url.pathname === "/" ? "browser/index.html" : url.pathname,
    )
    if (!p.startsWith(hostDir) || !existsSync(p) || statSync(p).isDirectory()) {
      res.writeHead(404)
      res.end()
      return
    }
    body = readFileSync(p)
    type = types[extname(p)] ?? "application/octet-stream"
  }
  const headers = {
    "Content-Type": type,
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Embedder-Policy": "require-corp",
    "Cache-Control": "no-store",
  }
  const enc = url.searchParams.get("enc")
  if (enc === "br" || enc === "gzip") {
    body = compress(url.pathname, body, enc)
    headers["Content-Encoding"] = enc
  }
  headers["Content-Length"] = body.length
  res.writeHead(200, headers)
  res.end(body)
}).listen(Number(port), "127.0.0.1", () =>
  console.log(
    `serving on http://127.0.0.1:${port}/ (${files.length} workspace files, ${fsBin.length} bytes)`,
  ),
)
