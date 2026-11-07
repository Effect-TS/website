import type { Html, HtmlBuilder } from "foldkit/html"
import type { Message } from "../message"

type Builder = HtmlBuilder<Message>

/** Plain source. Highlighting comes later and keeps the same box. */
export const snippetView = (source: string, h: Builder): Html =>
  h.div(
    [h.Class("overflow-x-auto")],
    [
      h.div(
        [h.Class("relative min-w-full bg-background px-6 py-5")],
        [
          h.pre(
            [
              h.Class(
                "m-0 font-mono text-sm leading-[1.6] whitespace-pre [tab-size:2] text-zinc-300",
              ),
            ],
            [source],
          ),
        ],
      ),
    ],
  )
