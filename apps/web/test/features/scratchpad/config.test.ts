import { assert, describe, test } from "vite-plus/test"
import {
  DEFAULT_SCRATCHPAD_FILES,
  DEFAULT_SCRATCHPAD_SNIPPET,
  resolveLspWsUrl,
  SCRATCHPAD_ENTRY_PATH,
  SCRATCHPAD_FILE_URI,
  SCRATCHPAD_ROOT_URI,
} from "../../../src/features/scratchpad/config.ts"
import {
  MAX_DOC_BYTES,
  utf8ByteLength,
} from "../../../src/features/scratchpad/session.ts"

describe("Scratchpad config", () => {
  test("resolveLspWsUrl defaults to same-origin ws:// on http and wss:// on https", () => {
    assert.equal(
      resolveLspWsUrl(undefined, {
        protocol: "http:",
        host: "localhost:4321",
      }),
      "ws://localhost:4321/api/lsp",
    )

    assert.equal(
      resolveLspWsUrl(undefined, {
        protocol: "https:",
        host: "effect.website",
      }),
      "wss://effect.website/api/lsp",
    )
  })

  test("resolveLspWsUrl prefers non-empty PUBLIC_LSP_WS_URL override and ignores blank overrides", () => {
    assert.equal(
      resolveLspWsUrl("  ws://127.0.0.1:8787  ", {
        protocol: "https:",
        host: "effect.website",
      }),
      "ws://127.0.0.1:8787",
    )

    assert.equal(
      resolveLspWsUrl("   ", {
        protocol: "https:",
        host: "effect.website",
      }),
      "wss://effect.website/api/lsp",
    )
  })

  test("workspace URIs and default snippet are configured for Effect TS377xxx diagnostics", () => {
    assert.equal(SCRATCHPAD_ROOT_URI, "file:///workspace")
    assert.equal(SCRATCHPAD_ENTRY_PATH, "src/main.ts")
    assert.equal(SCRATCHPAD_FILE_URI, "file:///workspace/src/main.ts")
    assert.isTrue("src/main.ts" in DEFAULT_SCRATCHPAD_FILES)
    assert.isTrue("src/greeter.ts" in DEFAULT_SCRATCHPAD_FILES)
    assert.isTrue(DEFAULT_SCRATCHPAD_SNIPPET.includes('from "effect"'))
    assert.isTrue(DEFAULT_SCRATCHPAD_SNIPPET.includes("Effect.gen"))
    assert.isBelow(utf8ByteLength(DEFAULT_SCRATCHPAD_SNIPPET), MAX_DOC_BYTES)
  })
})
