import type { RadioGroup } from "@foldkit/ui"
import { Array, Option } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"
import type {
  AnyExampleControl,
  ExampleDefinition,
} from "../../model/example-definition"
import { Message } from "../message"
import { controlGroupId } from "../model"
import { ControlGroup } from "../tabs"

type Builder = HtmlBuilder<Message>

export interface ControlInput {
  readonly exampleKey: string
  readonly valueOf: (control: AnyExampleControl) => string
  readonly groupOf: (control: AnyExampleControl) => RadioGroup.Model
}

const controlView = (
  control: AnyExampleControl,
  { exampleKey, valueOf, groupOf }: ControlInput,
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
        slotId: controlGroupId(exampleKey, control.id),
        model: groupOf(control),
        view: ControlGroup.view,
        viewInputs: {
          options: control.options,
          selectedValue: Option.some(valueOf(control)),
          ariaLabel: control.label,
          orientation: "Horizontal",
          toView: (render) =>
            h.div(
              [
                ...render.group,
                h.Class(
                  "flex w-fit flex-wrap rounded-lg border border-neutral-700/30 bg-neutral-800/50 p-1",
                ),
              ],
              Array.map(render.options, (option) =>
                h.keyed("button")(
                  option.value,
                  [
                    ...option.option,
                    h.Class(
                      `cursor-pointer rounded-md px-3 py-1.5 text-center font-mono text-sm transition-colors focus-visible:outline-2 focus-visible:outline-sky-400 ${
                        option.isSelected
                          ? "bg-neutral-700/80 font-semibold text-white shadow-md"
                          : "font-normal text-neutral-400 hover:text-neutral-300"
                      }`,
                    ),
                  ],
                  [h.span(option.label, [option.value])],
                ),
              ),
            ),
        },
        toParentMessage: (message) =>
          Message.GotControlGroupMessage({ controlId: control.id, message }),
      }),
    ],
  )

export const view = (
  example: ExampleDefinition,
  input: ControlInput,
  isDied: boolean,
  h: Builder,
): Html =>
  Array.isReadonlyArrayEmpty(example.controls)
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
