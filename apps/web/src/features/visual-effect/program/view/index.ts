import { Array, Option } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"
import { EXAMPLES_CATALOG } from "../../catalog/index"
import { CATEGORIES, controlValueOf, entriesOf, findEntry } from "../catalog"
import { Message } from "../message"
import type { Model } from "../model"
import { stepKeyOf } from "../catalog"
import { idle } from "../domain"
import { configView } from "./config"
import { headerView } from "./header"
import { finalizersView } from "./finalizers"
import { arrowRight } from "./icons"
import { nodeView } from "./node"
import { snippetView } from "./snippet"
import { timelineView } from "./timeline"

type Builder = HtmlBuilder<Message>

const categoryTabs = (model: Model, h: Builder): Html =>
  h.div(
    [
      h.Role("tablist"),
      h.AriaLabel("Categories"),
      h.Class(
        "scrollbar-hide flex overflow-x-auto overscroll-x-contain bg-zinc-950/90 select-none",
      ),
    ],
    Array.map(CATEGORIES, (category) =>
      h.keyed("button")(
        category,
        [
          h.Type("button"),
          h.Role("tab"),
          h.AriaSelected(category === model.category),
          h.OnClick(Message.ClickedCategory({ category })),
          h.Class(
            `min-w-fit flex-1 shrink-0 cursor-pointer px-4 py-3 font-mono text-sm tracking-wide whitespace-nowrap uppercase transition-colors md:px-6 md:text-base ${
              category === model.category
                ? "bg-zinc-900 font-medium text-white"
                : "text-zinc-400 hover:text-white"
            }`,
          ),
        ],
        [EXAMPLES_CATALOG[category].label],
      ),
    ),
  )

const exampleTabs = (model: Model, h: Builder): Html =>
  h.div(
    [
      h.Role("tablist"),
      h.AriaLabel("Examples"),
      h.Class(
        "scrollbar-hide flex items-center overflow-x-auto overscroll-x-contain border-y border-zinc-800 bg-zinc-950 select-none",
      ),
    ],
    Array.map(entriesOf(model.category), ({ key, example }) =>
      h.keyed("button")(
        key,
        [
          h.Type("button"),
          h.Role("tab"),
          h.AriaSelected(key === model.exampleKey),
          h.OnClick(Message.ClickedExample({ key })),
          h.Class(
            `min-w-fit flex-1 shrink-0 cursor-pointer px-3 py-2 font-mono text-sm whitespace-nowrap transition-colors ${
              key === model.exampleKey
                ? "bg-zinc-900 text-white"
                : "text-zinc-400 hover:bg-zinc-800/50 hover:text-white"
            }`,
          ),
        ],
        [
          h.span([], [example.title]),
          ...(example.subtitle === undefined
            ? []
            : [
                h.span(
                  [h.Class("ml-1 text-zinc-400")],
                  [`(${example.subtitle})`],
                ),
              ]),
        ],
      ),
    ),
  )

const nodesView = (model: Model, isDied: boolean, h: Builder): Html =>
  Option.match(findEntry(model.exampleKey), {
    onNone: () => h.empty,
    onSome: ({ example }) =>
      h.div(
        [
          h.Class(
            `border-b bg-background p-6 transition-colors duration-200 ${
              isDied ? "border-[rgba(127,29,29,0.5)]" : "border-zinc-800"
            }`,
          ),
        ],
        [
          h.div(
            [h.Class("flex items-center justify-start gap-6")],
            [
              ...(example.steps.length === 0
                ? []
                : [
                    h.div(
                      [h.Class("flex flex-wrap justify-center gap-6")],
                      Array.map(example.steps, (step, index) =>
                        h.keyed("div")(
                          stepKeyOf(model.exampleKey, index),
                          [],
                          [
                            nodeView(
                              model.steps[stepKeyOf(model.exampleKey, index)] ??
                                idle,
                              step.label,
                              h,
                            ),
                          ],
                        ),
                      ),
                    ),
                    h.div(
                      [h.Class("mb-6 flex items-center text-neutral-500")],
                      [arrowRight(h, { className: "size-6", isFilled: true })],
                    ),
                  ]),
              nodeView(model.run, "result", h),
            ],
          ),
        ],
      ),
  })

const surfaceView = (model: Model, h: Builder): Html =>
  Option.match(findEntry(model.exampleKey), {
    onNone: () => h.empty,
    onSome: ({ example, key }) => {
      const isDied = model.run._tag === "Died"
      return h.div(
        [
          h.Class(
            `flex w-full min-w-0 flex-col border transition-[border-color,box-shadow] duration-200 ${
              isDied
                ? "border-[rgba(127,29,29,0.5)] shadow-[0_0_10px_rgba(220,38,38,0.06)]"
                : "border-zinc-800"
            }`,
          ),
        ],
        [
          headerView(example, model.run, h),
          configView(
            example,
            (control) => controlValueOf(model.controls, key, control),
            isDied,
            h,
          ),
          nodesView(model, isDied, h),
          example.features.finalizers ? finalizersView(model, h) : h.empty,
          example.features.timeline ? timelineView(model, h) : h.empty,
          snippetView(
            example.code.resolve(model.controls[key] ?? {}).source,
            model.maybeHighlighted,
            h,
          ),
        ],
      )
    },
  })

export const view = (model: Model, h: Builder): Html =>
  h.div(
    [h.Class("border-r border-zinc-800 shadow-2xl shadow-black/20")],
    [
      h.div([h.Class("relative")], [categoryTabs(model, h)]),
      h.div(
        [h.Class("w-full")],
        [
          h.div(
            [h.Class("flex flex-col")],
            [
              h.div([h.Class("relative")], [exampleTabs(model, h)]),
              h.div(
                [h.Class("overflow-x-auto p-3 lg:p-4")],
                [surfaceView(model, h)],
              ),
            ],
          ),
        ],
      ),
    ],
  )
