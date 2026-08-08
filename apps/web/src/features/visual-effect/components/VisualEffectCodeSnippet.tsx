import type { ThemedToken } from "shiki/types"
import { useAtomValue } from "@effect/atom-react"
import * as React from "react"
import type { CodeSnippetDefinition } from "@/features/visual-effect/model/example-definition"
import type { ResolvedOffsetRange } from "@/features/visual-effect/model/snippet-highlights"
import { getSnippetTokens } from "@/features/visual-effect/runtime/shiki-singleton"
import { VisualEffectCodeSnippetHighlight } from "./VisualEffectCodeSnippetHighlight"

const EMPTY_RANGES: ReadonlyArray<ResolvedOffsetRange> = []

type TokensState =
  | {
      readonly _tag: "Loading"
    }
  | {
      readonly _tag: "Ready"
      readonly tokens: ReadonlyArray<ReadonlyArray<ThemedToken>>
    }
  | {
      readonly _tag: "Error"
      readonly message: string
    }

export function VisualEffectCodeSnippet({
  snippet,
  activeTarget,
}: {
  readonly snippet: CodeSnippetDefinition
  readonly activeTarget: string | null
}) {
  const [tokensState, setTokensState] = React.useState<TokensState>({
    _tag: "Loading",
  })
  const snippetContainerReference = React.useRef<HTMLDivElement | null>(null)
  const resolvedSnippet = useAtomValue(snippet.atom)

  React.useEffect(() => {
    let isMounted = true
    setTokensState({ _tag: "Loading" })

    void getSnippetTokens(resolvedSnippet.language, resolvedSnippet.source)
      .then((tokens) => {
        if (!isMounted) {
          return
        }

        setTokensState({
          _tag: "Ready",
          tokens,
        })
      })
      .catch((error: unknown) => {
        if (!isMounted) {
          return
        }

        const message =
          error instanceof Error
            ? error.message
            : "Failed to load syntax highlighting"
        setTokensState({
          _tag: "Error",
          message,
        })
      })

    return () => {
      isMounted = false
    }
  }, [resolvedSnippet.language, resolvedSnippet.source])

  const activeRanges = activeTarget
    ? (resolvedSnippet.highlightsByTarget[activeTarget] ?? EMPTY_RANGES)
    : EMPTY_RANGES

  return (
    <React.Fragment>
      <div className="overflow-x-auto">
        <div
          ref={snippetContainerReference}
          className="relative min-w-full bg-background px-6 py-5"
        >
          {tokensState._tag === "Ready" ? (
            <SnippetTokens tokens={tokensState.tokens} />
          ) : (
            <SnippetFallback source={resolvedSnippet.source} />
          )}

          <VisualEffectCodeSnippetHighlight
            containerRef={snippetContainerReference}
            ranges={activeRanges}
          />
        </div>
      </div>

      {tokensState._tag === "Error" && (
        <div className="border-t border-zinc-800 px-6 py-2 font-mono text-xs text-zinc-500">
          highlighting unavailable: {tokensState.message}
        </div>
      )}
    </React.Fragment>
  )
}

function SnippetTokens({
  tokens,
}: {
  readonly tokens: ReadonlyArray<ReadonlyArray<ThemedToken>>
}) {
  return (
    <pre className="m-0 font-mono text-sm leading-[1.6] whitespace-pre [tab-size:2] text-zinc-300">
      {tokens.map((lineTokens, lineIndex) => (
        <div
          key={`snippet-line-${lineIndex.toString()}`}
          className="block min-h-[1.6em]"
        >
          {lineTokens.length === 0 ? (
            <span>{"\u00a0"}</span>
          ) : (
            lineTokens.map((token, tokenIndex) => {
              const tokenEnd = token.offset + token.content.length

              return (
                <span
                  key={`snippet-token-${lineIndex.toString()}-${tokenIndex.toString()}`}
                  style={tokenStyle(token)}
                  data-start={token.offset.toString()}
                  data-end={tokenEnd.toString()}
                >
                  {token.content}
                </span>
              )
            })
          )}
        </div>
      ))}
    </pre>
  )
}

function SnippetFallback({ source }: { readonly source: string }) {
  return (
    <pre className="m-0 font-mono text-sm leading-[1.6] whitespace-pre [tab-size:2] text-zinc-300">
      {source}
    </pre>
  )
}

const tokenStyle = (token: ThemedToken): React.CSSProperties => {
  const style: React.CSSProperties =
    token.htmlStyle === undefined ? {} : { ...token.htmlStyle }

  if (token.color !== undefined) {
    style.color = token.color
  }

  if (token.bgColor !== undefined) {
    style.backgroundColor = token.bgColor
  }

  if (token.fontStyle !== undefined) {
    applyTokenFontStyle(style, token.fontStyle)
  }

  return style
}

const applyTokenFontStyle = (style: React.CSSProperties, fontStyle: number) => {
  if ((fontStyle & 1) !== 0) {
    style.fontStyle = "italic"
  }

  if ((fontStyle & 2) !== 0) {
    style.fontWeight = 700
  }

  if ((fontStyle & 4) !== 0) {
    style.textDecorationLine = "underline"
  }
}
