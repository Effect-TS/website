import { Array, Option } from "effect"
import type { ChildAttribute, Html, HtmlBuilder } from "foldkit/html"
import { EXAMPLES_CATALOG, type ExampleCategory } from "../../catalog/index"
import { CATEGORIES, entriesOf } from "../catalog"
import { Message } from "../message"
import { CATEGORY_TABS_ID, EXAMPLE_TABS_ID, type Model } from "../model"
import { ScrollStrip } from "../mount"
import { CategoryTabs, ExampleTabs } from "../tabs"

type Builder = HtmlBuilder<Message>

const focusRing =
  "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-sky-400"

/** A strip that scrolls by drag, with a fade where more tabs wait on the right. */
const strip = (
  attributes: ReadonlyArray<ChildAttribute>,
  which: "Categories" | "Examples",
  className: string,
  fadeClassName: string,
  canScrollRight: boolean,
  tabs: ReadonlyArray<Html>,
  h: Builder,
): Html =>
  h.div(
    [h.Class("relative")],
    [
      h.div(
        [
          ...attributes,
          h.OnMount(ScrollStrip({ strip: which })),
          h.Class(className),
        ],
        tabs,
      ),
      canScrollRight
        ? h.div(
            [
              h.AriaHidden(true),
              h.Class(
                `pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l to-transparent ${fadeClassName}`,
              ),
            ],
            [],
          )
        : h.empty,
    ],
  )

export const categories = (model: Model, panel: Html, h: Builder): Html =>
  h.submodel({
    slotId: CATEGORY_TABS_ID,
    model: model.categoryTabs,
    view: CategoryTabs.view,
    viewInputs: {
      tabs: CATEGORIES,
      selectedValue: model.category,
      ariaLabel: "Categories",
      toView: (render) =>
        h.div(
          [],
          [
            strip(
              render.tablist,
              "Categories",
              "scrollbar-hide flex overflow-x-auto overscroll-x-contain bg-zinc-950/90 select-none",
              "from-zinc-950/90",
              model.categoriesCanScrollRight,
              Array.map(render.tabs, (tab) =>
                h.keyed("button")(
                  tab.value,
                  [
                    ...tab.tab,
                    h.Class(
                      `min-w-fit flex-1 shrink-0 cursor-pointer px-4 py-3 font-mono text-sm tracking-wide whitespace-nowrap uppercase transition-colors md:px-6 md:text-base ${focusRing} ${
                        tab.isActive
                          ? "bg-zinc-900 font-medium text-white"
                          : "text-zinc-400 hover:text-white"
                      }`,
                    ),
                  ],
                  [EXAMPLES_CATALOG[tab.value as ExampleCategory].label],
                ),
              ),
              h,
            ),
            h.div(
              [
                ...Option.match(Array.get(render.tabs, render.activeIndex), {
                  onNone: () => [],
                  onSome: ({ panel: attributes }) => attributes,
                }),
                h.Class("w-full"),
              ],
              [panel],
            ),
          ],
        ),
    },
    toParentMessage: (message) => Message.GotCategoryTabsMessage({ message }),
  })

export const examples = (model: Model, panel: Html, h: Builder): Html => {
  const entries = entriesOf(model.category)
  return h.submodel({
    slotId: EXAMPLE_TABS_ID,
    model: model.exampleTabs,
    view: ExampleTabs.view,
    viewInputs: {
      tabs: Array.map(entries, ({ key }) => key),
      selectedValue: model.exampleKey,
      ariaLabel: "Examples",
      toView: (render) =>
        h.div(
          [h.Class("flex flex-col")],
          [
            strip(
              render.tablist,
              "Examples",
              "scrollbar-hide flex items-center overflow-x-auto overscroll-x-contain border-y border-zinc-800 bg-zinc-950 select-none",
              "from-zinc-950",
              model.examplesCanScrollRight,
              Array.map(render.tabs, (tab) => {
                const example = Array.findFirst(
                  entries,
                  ({ key }) => key === tab.value,
                ).pipe(Option.map(({ example }) => example))
                return h.keyed("button")(
                  tab.value,
                  [
                    ...tab.tab,
                    h.Class(
                      `min-w-fit flex-1 shrink-0 cursor-pointer px-3 py-2 font-mono text-sm whitespace-nowrap transition-colors ${focusRing} ${
                        tab.isActive
                          ? "bg-zinc-900 text-white"
                          : "text-zinc-400 hover:bg-zinc-800/50 hover:text-white"
                      }`,
                    ),
                  ],
                  [
                    h.span(
                      [],
                      [
                        Option.match(example, {
                          onNone: () => tab.value,
                          onSome: ({ title }) => title,
                        }),
                      ],
                    ),
                    ...Option.match(
                      Option.flatMapNullishOr(
                        example,
                        ({ subtitle }) => subtitle,
                      ),
                      {
                        onNone: () => [],
                        onSome: (subtitle) => [
                          h.span(
                            [h.Class("ml-1 text-zinc-400")],
                            [`(${subtitle})`],
                          ),
                        ],
                      },
                    ),
                  ],
                )
              }),
              h,
            ),
            h.div(
              [
                ...Option.match(Array.get(render.tabs, render.activeIndex), {
                  onNone: () => [],
                  onSome: ({ panel: attributes }) => attributes,
                }),
                h.Class("overflow-x-auto p-3 lg:p-4"),
              ],
              [panel],
            ),
          ],
        ),
    },
    toParentMessage: (message) => Message.GotExampleTabsMessage({ message }),
  })
}
