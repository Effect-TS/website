import { assert, describe, test } from "vite-plus/test"
import { MemoryFileSystem } from "../src/MemoryFileSystem.ts"
import {
  decodeTypesPack,
  encodeTypesPack,
  mountTypesPack,
  TypesPackError,
} from "../src/TypesPack.ts"

const text = (s: string) => new TextEncoder().encode(s)
const sample = {
  packages: [{ name: "demo", version: "1.2.3" }],
  files: [
    { path: "demo/package.json", data: text('{"name":"demo"}') },
    { path: "demo/dist/index.d.ts", data: text("export declare const x: 1\n") },
    { path: "demo/empty.d.ts", data: new Uint8Array(0) },
  ],
}

describe("TypesPack", () => {
  test("round-trips packages and files", () => {
    const decoded = decodeTypesPack(encodeTypesPack(sample))
    assert.deepStrictEqual(decoded.packages, sample.packages)
    assert.deepStrictEqual(
      decoded.files.map((f) => [f.path, new TextDecoder().decode(f.data)]),
      sample.files.map((f) => [f.path, new TextDecoder().decode(f.data)]),
    )
  })

  test("decodes into views of the input buffer", () => {
    const bytes = encodeTypesPack(sample)
    const decoded = decodeTypesPack(bytes.buffer as ArrayBuffer)
    for (const file of decoded.files)
      assert.strictEqual(file.data.buffer, bytes.buffer)
  })

  test("decodes from a Uint8Array at an offset", () => {
    const bytes = encodeTypesPack(sample)
    const padded = new Uint8Array(bytes.length + 7)
    padded.set(bytes, 7)
    const decoded = decodeTypesPack(padded.subarray(7))
    assert.strictEqual(
      new TextDecoder().decode(decoded.files[0]!.data),
      '{"name":"demo"}',
    )
  })

  test("rejects corrupt input", () => {
    const bytes = encodeTypesPack(sample)
    assert.throws(() => decodeTypesPack(bytes.subarray(0, 8)), TypesPackError)
    const badMagic = bytes.slice()
    badMagic[0] = 0
    assert.throws(() => decodeTypesPack(badMagic), TypesPackError, /magic/)
    const badVersion = bytes.slice()
    new DataView(badVersion.buffer).setUint32(4, 99, true)
    assert.throws(() => decodeTypesPack(badVersion), TypesPackError, /version/)
    assert.throws(
      () => decodeTypesPack(bytes.subarray(0, bytes.length - 1)),
      TypesPackError,
      /out of bounds/,
    )
  })

  test("rejects unsafe or duplicate paths", () => {
    for (const path of [
      "../evil.d.ts",
      "/abs.d.ts",
      "a//b.d.ts",
      "a\\b.d.ts",
      "",
    ]) {
      assert.throws(
        () =>
          encodeTypesPack({
            packages: [],
            files: [{ path, data: new Uint8Array(0) }],
          }),
        TypesPackError,
      )
    }
    assert.throws(
      () =>
        encodeTypesPack({
          packages: [],
          files: [
            { path: "a.d.ts", data: new Uint8Array(0) },
            { path: "a.d.ts", data: new Uint8Array(0) },
          ],
        }),
      TypesPackError,
      /duplicate/,
    )
  })

  test("mounts under node_modules", () => {
    const fs = new MemoryFileSystem()
    mountTypesPack(fs, encodeTypesPack(sample))
    assert.strictEqual(
      fs.readTextFile("/workspace/node_modules/demo/package.json"),
      '{"name":"demo"}',
    )
    assert.isTrue(fs.isDirectory("/workspace/node_modules/demo/dist"))
    mountTypesPack(fs, sample, "/elsewhere/node_modules")
    assert.isTrue(fs.isFile("/elsewhere/node_modules/demo/empty.d.ts"))
  })
})
