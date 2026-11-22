// Usage: node size.mjs <file.wasm>...  prints raw, gzip -9 and brotli -q 11 sizes.
import { readFileSync } from "node:fs"
import { brotliCompressSync, gzipSync, constants } from "node:zlib"
for (const f of process.argv.slice(2)) {
  const b = readFileSync(f)
  const br = brotliCompressSync(b, {
    params: {
      [constants.BROTLI_PARAM_QUALITY]: 11,
      [constants.BROTLI_PARAM_SIZE_HINT]: b.length,
    },
  }).length
  console.log(
    f.split("/").pop().padEnd(36),
    "raw",
    b.length,
    "gzip",
    gzipSync(b, { level: 9 }).length,
    "brotli",
    br,
  )
}
