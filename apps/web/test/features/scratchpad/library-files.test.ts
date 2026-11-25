import { assert, describe, test } from "vite-plus/test"
import { libraryTabLabel } from "../../../src/features/scratchpad/library-files.ts"

describe("library tab labels", () => {
  test("show the package and the file, with the folders between shortened", () => {
    assert.equal(
      libraryTabLabel("node_modules/@effect/platform/dist/dts/HttpClient.d.ts"),
      "node_modules/@effect/platform/…/HttpClient.d.ts",
    )
  })
})
