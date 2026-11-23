import { assert, describe, test } from "vite-plus/test"
import {
  DEFAULT_SCRATCHPAD_FILES,
  DEFAULT_SCRATCHPAD_SNIPPET,
  SCRATCHPAD_ENTRY_PATH,
  SCRATCHPAD_FILE_URI,
  SCRATCHPAD_ROOT_URI,
} from "../../../src/features/scratchpad/config.ts"

describe("Scratchpad config", () => {
  test("workspace URIs and default snippet are configured for Effect TS377xxx diagnostics", () => {
    assert.equal(SCRATCHPAD_ROOT_URI, "file:///workspace")
    assert.equal(SCRATCHPAD_ENTRY_PATH, "src/main.ts")
    assert.equal(SCRATCHPAD_FILE_URI, "file:///workspace/src/main.ts")
    assert.isTrue("src/main.ts" in DEFAULT_SCRATCHPAD_FILES)
    assert.isTrue("src/greeter.ts" in DEFAULT_SCRATCHPAD_FILES)
    assert.isTrue(DEFAULT_SCRATCHPAD_SNIPPET.includes('from "effect"'))
    assert.isTrue(DEFAULT_SCRATCHPAD_SNIPPET.includes("Effect.gen"))
  })
})
