import { assert, describe, test } from "vite-plus/test"
import {
  classifyBootError,
  unsupportedReason,
} from "../../../src/features/scratchpad/container-webcontainer.ts"

describe("WebContainer boot errors", () => {
  test("a page without cross-origin isolation or SharedArrayBuffer is unsupported", () => {
    assert.isString(unsupportedReason({ crossOriginIsolated: false }))
    assert.isString(
      unsupportedReason({
        crossOriginIsolated: true,
        SharedArrayBuffer: undefined,
      }),
    )
    assert.isUndefined(
      unsupportedReason({
        crossOriginIsolated: true,
        SharedArrayBuffer: ArrayBuffer,
      }),
    )
  })

  test("boot rejections about isolation are unsupported, others are boot failures", () => {
    assert.strictEqual(
      classifyBootError(new Error("SharedArrayBuffer is not defined"))._tag,
      "ContainerUnsupported",
    )
    assert.strictEqual(
      classifyBootError(new Error("Unable to create more instances"))._tag,
      "ContainerBootFailed",
    )
  })
})
