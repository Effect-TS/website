import { Array, Option } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"
import type { HighlightRect } from "../domain"
import type { StyledLines } from "../highlight"
import { SNIPPET_ID } from "../measure"
import { AnimateHighlight } from "../mount"
import type { Message } from "../message"

type Builder = HtmlBuilder<Message>

const preClass =
  "m-0 font-mono text-sm leading-[1.6] whitespace-pre [tab-size:2] text-zinc-300"

const plainView = (source: string, h: Builder): Html =>
  h.pre([h.Class(preClass)], [source])

const tokensView = (lines: StyledLines, h: Builder): Html =>
  h.pre(
    [h.Class(preClass)],
    Array.map(lines, (line, lineIndex) =>
      h.keyed("div")(
        `line-${lineIndex}`,
        [h.Class("block min-h-[1.6em]")],
        line.length === 0
          ? [h.span([], ["\u00a0"])]
          : Array.map(line, (token, tokenIndex) =>
              h.keyed("span")(
                `token-${lineIndex}-${tokenIndex}`,
                [
                  h.Style(token.style),
                  h.DataAttribute("start", String(token.start)),
                  h.DataAttribute("end", String(token.end)),
                ],
                [token.content],
              ),
            ),
      ),
    ),
  )

/**
 * The tokens when they belong to this source, plain source until then. Both
 * have the same line height, so the box does not move when tokens arrive.
 */
export const snippetView = (
  source: string,
  maybeHighlighted: Option.Option<{
    readonly source: string
    readonly lines: StyledLines
  }>,
  highlight: {
    readonly maybeRect: Option.Option<HighlightRect>
    readonly isVisible: boolean
  },
  h: Builder,
): Html =>
  h.div(
    [h.Class("overflow-x-auto")],
    [
      h.div(
        [
          h.Id(SNIPPET_ID),
          h.Class("relative min-w-full bg-background px-6 py-5"),
        ],
        [
          Option.match(maybeHighlighted, {
            onNone: () => plainView(source, h),
            onSome: (shown) =>
              shown.source === source
                ? tokensView(shown.lines, h)
                : plainView(source, h),
          }),
          Option.match(highlight.maybeRect, {
            onNone: () => h.empty,
            onSome: (rect) =>
              h.div(
                [
                  h.AriaHidden(true),
                  h.OnMount(
                    AnimateHighlight({
                      ...rect,
                      isVisible: highlight.isVisible,
                    }),
                  ),
                  h.Class(
                    "pointer-events-none absolute top-0 left-0 z-10 rounded-md border border-[rgba(56,189,248,0.6)] bg-[rgba(56,189,248,0.15)] shadow-[0_0_14px_rgba(56,189,248,0.3)]",
                  ),
                  h.Style({ opacity: "0" }),
                ],
                [],
              ),
          }),
        ],
      ),
    ],
  )
