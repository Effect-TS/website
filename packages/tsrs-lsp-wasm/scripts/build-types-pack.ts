/**
 * Writes dist/effect-types.pack (and dist/effect-types.pack.gz): the declaration files and package.json files of the packages the virtual
 * workspace mounts under node_modules (default: effect, at the version this package depends on).
 *
 *   node scripts/build-types-pack.ts [package ...]
 */
import { createHash } from "node:crypto"
import * as fs from "node:fs"
import * as path from "node:path"
import { brotliCompressSync, constants, gzipSync } from "node:zlib"
import { encodeTypesPack } from "../src/TypesPack.ts"
import { readManifest, updateManifest } from "./manifest.ts"
import {
  collectTypesPack,
  DEFAULT_TYPES_PACKAGES,
  PACKAGE_DIR,
} from "./types-pack.ts"

const OUTPUT_NAME = "effect-types.pack"
// The same bytes gzipped, for serving: CDNs do not compress application/octet-stream, so the app ships this file
// and the worker inflates it with DecompressionStream.
const GZIP_NAME = `${OUTPUT_NAME}.gz`

const names = process.argv.slice(2)
const pack = collectTypesPack(names.length > 0 ? names : DEFAULT_TYPES_PACKAGES)
const bytes = encodeTypesPack(pack)
const distDir = path.join(PACKAGE_DIR, "dist")
fs.mkdirSync(distDir, { recursive: true })
const output = path.join(distDir, OUTPUT_NAME)
const sha256 = createHash("sha256").update(bytes).digest("hex")
const unchanged =
  fs.existsSync(output) &&
  createHash("sha256").update(fs.readFileSync(output)).digest("hex") === sha256
if (!unchanged) fs.writeFileSync(output, bytes)
const gzipOutput = path.join(distDir, GZIP_NAME)
const gzipped =
  unchanged && fs.existsSync(gzipOutput)
    ? undefined
    : gzipSync(bytes, { level: 9 })
if (gzipped !== undefined) fs.writeFileSync(gzipOutput, gzipped)
const previous = readManifest(distDir).typesPack
// brotli -q 11 of 12 MB takes about 20 s; an unchanged pack keeps the recorded sizes.
const typesPack =
  unchanged && previous?.sha256 === sha256
    ? previous
    : {
        file: OUTPUT_NAME,
        packages: pack.packages,
        files: pack.files.length,
        bytes: bytes.length,
        gzipBytes: (gzipped ?? gzipSync(bytes, { level: 9 })).length,
        brotliBytes: brotliCompressSync(bytes, {
          params: {
            [constants.BROTLI_PARAM_QUALITY]: 11,
            [constants.BROTLI_PARAM_SIZE_HINT]: bytes.length,
          },
        }).length,
        sha256,
      }
updateManifest(distDir, { typesPack })
console.log(
  `[tsrs-lsp-wasm] ${unchanged ? "unchanged" : "wrote"} dist/${OUTPUT_NAME}: ` +
    `${pack.packages.map((p) => `${p.name}@${p.version}`).join(", ")}, ${typesPack.files} files, ` +
    `${typesPack.bytes} bytes, gzip ${typesPack.gzipBytes}, brotli ${typesPack.brotliBytes}`,
)
