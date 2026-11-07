import { Button } from "@foldkit/ui"
import { Match } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"
import type { ExampleDefinition } from "../../model/example-definition"
import { canReset, type RunState } from "../domain"
import { Message } from "../message"
import type { Pointer } from "../drivers/header-animation"
import { AnimateHeader } from "../mount"
import { play, rotateCcw, square } from "./icons"

type Builder = HtmlBuilder<Message>

const tileClass = (state: RunState): string =>
  Match.value(state).pipe(
    Match.tagsExhaustive({
      Running: () => "bg-blue-500",
      Idle: () => "bg-green-700",
      Succeeded: () => "bg-green-700",
      Failed: () => "bg-red-500",
      Interrupted: () => "bg-orange-500",
      Died: () => "bg-red-800",
    }),
  )

const iconView = (state: RunState, h: Builder): Html => {
  const reset = () =>
    rotateCcw(h, { className: "-mr-px size-5", strokeWidth: "3" })
  return Match.value(state).pipe(
    Match.tagsExhaustive({
      Running: () => square(h, { className: "size-5", isFilled: true }),
      Succeeded: reset,
      Failed: reset,
      Died: reset,
      Interrupted: reset,
      Idle: () =>
        play(h, {
          className: "-mr-px size-5",
          isFilled: true,
          strokeWidth: "1",
        }),
    }),
  )
}

const actionOf = (state: RunState): "Stop" | "Reset" | "Run" =>
  state._tag === "Running" ? "Stop" : canReset(state) ? "Reset" : "Run"

export const view = (
  example: ExampleDefinition,
  state: RunState,
  hasInteracted: boolean,
  pointer: Pointer,
  h: Builder,
): Html => {
  const isDied = state._tag === "Died"
  return Button.view(
    {
      onClick: Message.ClickedHeader(),
      toView: ({ button }) =>
        h.button(
          [
            ...button,
            h.DataAttribute("state", state._tag),
            h.OnMount(
              AnimateHeader({ tag: state._tag, hasInteracted, pointer }),
            ),
            h.OnMouseEnter(Message.EnteredHeader()),
            h.OnMouseLeave(Message.LeftHeader()),
            h.OnMouseDown(Message.PressedHeader()),
            h.OnMouseUp(Message.ReleasedHeader()),
            h.AriaLabel(`${actionOf(state)} ${example.title}`),
            h.Class(
              `flex w-full cursor-pointer items-start gap-3 border-b px-6 py-4 text-left transition-colors duration-200 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-sky-400 ${
                isDied
                  ? "border-[rgba(127,29,29,0.5)] bg-black/50 hover:bg-zinc-900/50"
                  : "border-zinc-800 bg-[rgba(39,39,42,0.9)] hover:bg-[rgba(51,51,56,0.9)]"
              }`,
            ),
          ],
          [
            h.span(
              [h.DataAttribute("header", "wiggle"), h.Class("flex shrink-0")],
              [
                h.span(
                  [
                    h.DataAttribute("header", "tile"),
                    h.Class(
                      `flex size-10 items-center justify-center rounded-lg text-white transition-colors duration-200 ${tileClass(state)}`,
                    ),
                  ],
                  [
                    h.span(
                      [
                        h.DataAttribute("header", "icon"),
                        h.Class("flex items-center"),
                      ],
                      [iconView(state, h)],
                    ),
                  ],
                ),
              ],
            ),
            h.span(
              [h.Class("flex min-w-0 flex-1 flex-col gap-1 text-neutral-400")],
              [
                h.span(
                  [
                    h.Class(
                      "flex items-baseline gap-2 font-mono text-base leading-tighter font-semibold whitespace-nowrap",
                    ),
                  ],
                  [
                    h.span([h.Class("text-white")], [example.title]),
                    ...(example.subtitle === undefined
                      ? []
                      : [h.span([h.Class("font-medium")], [example.subtitle])]),
                  ],
                ),
                h.span(
                  [h.Class("text-left text-sm leading-4")],
                  [example.description ?? ""],
                ),
              ],
            ),
          ],
        ),
    },
    h,
  )
}
