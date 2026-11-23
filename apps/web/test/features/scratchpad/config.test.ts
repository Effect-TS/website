import { assert, describe, test } from "vite-plus/test"
import {
  SCRATCHPAD_ENTRY_PATH,
  SCRATCHPAD_FILE_URI,
  SCRATCHPAD_ROOT_URI,
} from "../../../src/features/scratchpad/config.ts"

describe("Scratchpad config", () => {
  test("workspace URIs point at the entry file", () => {
    assert.equal(SCRATCHPAD_ROOT_URI, "file:///workspace")
    assert.equal(SCRATCHPAD_ENTRY_PATH, "src/main.ts")
    assert.equal(SCRATCHPAD_FILE_URI, "file:///workspace/src/main.ts")
  })
})
