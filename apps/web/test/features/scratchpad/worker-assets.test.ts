import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { gzipSync } from "node:zlib"
import { assert, describe, test } from "vite-plus/test"
import {
  missingArtifactsMessage,
  missingTsrsLspArtifacts,
  TSRS_LSP_BUILD_COMMAND,
} from "../../../src/features/scratchpad/tsrs-lsp-assets-plugin.ts"
import {
  AssetLoadError,
  fetchCounted,
  inflateIfGzip,
  isGzip,
  loadTypesPack,
} from "../../../src/features/scratchpad/worker-assets.ts"

const bytesOf = (text: string) => new TextEncoder().encode(text)

describe("worker assets", () => {
  test("counts the bytes of a response while keeping its headers", async () => {
    const chunks: Array<number> = []
    const response = await fetchCounted(
      () =>
        Promise.resolve(
          new Response(bytesOf("0123456789"), {
            headers: { "content-type": "application/wasm" },
          }),
        ),
      "/lsp.wasm",
      (n) => chunks.push(n),
    )
    assert.equal(response.headers.get("content-type"), "application/wasm")
    assert.equal((await response.arrayBuffer()).byteLength, 10)
    assert.equal(
      chunks.reduce((a, b) => a + b, 0),
      10,
    )
  })

  test("fails with the URL and status when a fetch fails", async () => {
    try {
      await fetchCounted(
        () =>
          Promise.resolve(
            new Response("nope", { status: 404, statusText: "Not Found" }),
          ),
        "/missing.wasm",
        () => {},
      )
      assert.fail("expected a failure")
    } catch (error) {
      assert.instanceOf(error, AssetLoadError)
      assert.match((error as Error).message, /\/missing\.wasm.*404 Not Found/)
    }
  })

  test("inflates a gzipped types pack and passes plain bytes through", async () => {
    const plain = bytesOf("TSPK pack bytes")
    const gzipped = new Uint8Array(gzipSync(plain))
    assert.isTrue(isGzip(gzipped))
    assert.isFalse(isGzip(plain))
    assert.deepEqual(await inflateIfGzip(gzipped), plain)
    assert.deepEqual(await inflateIfGzip(plain), plain)

    let counted = 0
    const loaded = await loadTypesPack(
      () => Promise.resolve(new Response(gzipped)),
      "/effect-types.pack.gz",
      (n) => (counted += n),
    )
    assert.deepEqual(loaded, plain)
    assert.equal(counted, gzipped.byteLength)
  })

  test("names every missing artifact and the command that builds them", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tsrs-lsp-dist-"))
    try {
      fs.writeFileSync(path.join(dir, "manifest.json"), "{}")
      const missing = missingTsrsLspArtifacts(dir)
      assert.deepEqual(
        missing.map((file) => path.basename(file)),
        ["tsrs-effect-lsp.wasm", "effect-types.pack.gz", "licenses"],
      )
      const message = missingArtifactsMessage(missing)
      assert.include(message, TSRS_LSP_BUILD_COMMAND)
      assert.include(message, "tsrs-effect-lsp.wasm")
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })
})
