export const SCRATCHPAD_ROOT_URI = "file:///workspace"
export const SCRATCHPAD_FILE_URI = "file:///workspace/main.ts"

export const DEFAULT_SCRATCHPAD_SNIPPET = `import { Effect } from "effect"

const program = Effect.gen(function* () {
  // Floating Effect (Effect TS377001) — yield* or remove to resolve
  Effect.succeed("unhandled")

  const answer = yield* Effect.succeed(42)
  return answer * 2
})

export { program }
`

export interface LocationLike {
  readonly protocol: string
  readonly host: string
}

/**
 * Resolves the LSP WebSocket endpoint URL.
 *
 * Uses `override` (`PUBLIC_LSP_WS_URL`) when non-empty, otherwise defaults to
 * same-origin `ws(s)://<location.host>/api/lsp`.
 */
export const resolveLspWsUrl = (
  override?: string,
  location?: LocationLike,
): string => {
  const trimmed = override?.trim()
  if (trimmed !== undefined && trimmed.length > 0) {
    return trimmed
  }

  const loc = location ??
    (typeof window !== "undefined" ? window.location : undefined) ?? {
      protocol: "http:",
      host: "localhost",
    }

  const scheme = loc.protocol === "https:" ? "wss:" : "ws:"
  return `${scheme}//${loc.host}/api/lsp`
}
