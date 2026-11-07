import type { Tabs } from "@foldkit/ui"
import { Array } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"
import type {
  AnyExampleControl,
  ExampleDefinition,
} from "../../model/example-definition"
import { Message } from "../message"
import { controlTabsId } from "../model"
import { ControlTabs } from "../tabs"

type Builder = HtmlBuilder<Message>

export interface ControlInput {
  readonly exampleKey: string
  readonly valueOf: (control: AnyExampleControl) => string
  readonly tabsOf: (control: AnyExampleControl) => Tabs.Model
}

const controlView = (
  control: AnyExampleControl,
  { exampleKey, valueOf, tabsOf }: ControlInput,
  h: Builder,
): Html =>
  h.keyed("div")(
    control.id,
    [h.Class("flex flex-wrap items-center justify-start gap-3")],
    [
      h.span(
        [
          h.Class(
            "font-mono text-sm tracking-wider text-neutral-500 uppercase select-none",
          ),
        ],
        [control.label],
      ),
      h.submodel({
        slotId: controlTabsId(exampleKey, control.id),
        model: tabsOf(control),
        view: ControlTabs.view,
        viewInputs: {
          tabs: control.options,
          selectedValue: valueOf(control),
          ariaLabel: control.label,
          toView: (render) =>
            h.div(
              [
                ...(render.tablist as ReadonlyArray<never>),
                h.Class(
                  "flex w-fit flex-wrap rounded-lg border border-neutral-700/30 bg-neutral-800/50 p-1",
                ),
              ],
              Array.map(render.tabs, (tab) =>
                h.keyed("button")(
                  tab.value,
                  [
                    ...tab.tab,
                    h.Class(
                      `cursor-pointer rounded-md px-3 py-1.5 text-center font-mono text-sm transition-colors focus-visible:outline-2 focus-visible:outline-sky-400 ${
                        tab.isActive
                          ? "bg-neutral-700/80 font-semibold text-white shadow-md"
                          : "font-normal text-neutral-400 hover:text-neutral-300"
                      }`,
                    ),
                  ],
                  [tab.value],
                ),
              ),
            ),
        },
        toParentMessage: (message) =>
          Message.GotControlTabsMessage({ controlId: control.id, message }),
      }),
    ],
  )

export const configView = (
  example: ExampleDefinition,
  input: ControlInput,
  isDied: boolean,
  h: Builder,
): Html =>
  example.controls.length === 0
    ? h.empty
    : h.section(
        [
          h.Class(
            `border-b transition-colors duration-200 ${
              isDied
                ? "border-[rgba(127,29,29,0.5)] bg-[rgba(9,9,11,0.78)]"
                : "border-zinc-800 bg-[rgba(9,9,11,0.72)]"
            }`,
          ),
        ],
        [
          h.div(
            [
              h.Class(
                "bg-linear-to-t from-neutral-800/40 to-neutral-800/20 px-6 py-4",
              ),
            ],
            Array.map(example.controls, (control) =>
              controlView(control, input, h),
            ),
          ),
        ],
      )
