import { assert, describe, test } from "vite-plus/test"
import {
  isLibraryDocumentPath,
  libraryTabLabel,
} from "../../../src/features/scratchpad/library-files.ts"

describe("library tab labels", () => {
  test("show the package and the file, with the folders between shortened", () => {
    assert.equal(
      libraryTabLabel("node_modules/effect/dist/Effect.d.ts"),
      "node_modules/effect/…/Effect.d.ts",
    )
    assert.equal(
      libraryTabLabel("node_modules/@effect/platform/dist/dts/HttpClient.d.ts"),
      "node_modules/@effect/platform/…/HttpClient.d.ts",
    )
    assert.equal(
      libraryTabLabel("node_modules/effect/index.d.ts"),
      "node_modules/effect/index.d.ts",
    )
  })

  test("library TypeScript documents include .d.mts and .d.cts declarations", () => {
    assert.isTrue(isLibraryDocumentPath("node_modules/a/index.d.ts"))
    assert.isTrue(isLibraryDocumentPath("node_modules/a/index.d.mts"))
    assert.isTrue(isLibraryDocumentPath("node_modules/a/index.d.cts"))
    assert.isFalse(isLibraryDocumentPath("node_modules/a/package.json"))
    assert.isFalse(isLibraryDocumentPath("src/index.ts"))
  })
})
