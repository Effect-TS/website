import { Array } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"
import type {
  AnyExampleControl,
  ExampleDefinition,
} from "../../model/example-definition"
import { Message } from "../message"

type Builder = HtmlBuilder<Message>

const controlView = (
  control: AnyExampleControl,
  value: string,
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
      h.div(
        [
          h.Role("radiogroup"),
          h.AriaLabel(control.label),
          h.Class(
            "flex w-fit flex-wrap rounded-lg border border-neutral-700/30 bg-neutral-800/50 p-1",
          ),
        ],
        Array.map(control.options, (option) =>
          h.keyed("button")(
            option,
            [
              h.Type("button"),
              h.Role("radio"),
              h.AriaChecked(option === value),
              h.OnClick(
                Message.ChangedControl({
                  controlId: control.id,
                  value: option,
                }),
              ),
              h.Class(
                `cursor-pointer rounded-md px-3 py-1.5 text-center font-mono transition-colors ${
                  option === value
                    ? "bg-neutral-700/80 font-semibold text-white shadow-md"
                    : "font-normal text-neutral-400 hover:text-neutral-300"
                }`,
              ),
            ],
            [option],
          ),
        ),
      ),
    ],
  )

export const configView = (
  example: ExampleDefinition,
  valueOf: (control: AnyExampleControl) => string,
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
              controlView(control, valueOf(control), h),
            ),
          ),
        ],
      )
