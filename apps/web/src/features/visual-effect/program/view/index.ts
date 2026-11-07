import { RadioGroup } from "@foldkit/ui"
import { Array, Option } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"
import { controlValueOf, findEntry } from "../catalog"
import { Message } from "../message"
import { controlGroupId, controlGroupKey, type Model } from "../model"
import { stepKeyOf } from "../catalog"
import { describe, idle, isNotificationVisible } from "../domain"
import * as Config from "./config"
import { RESULT_ID } from "../motion"
import * as Header from "./header"
import * as Finalizers from "./finalizers"
import { arrowRight } from "./icons"
import * as Node from "./node"
import { sameTarget, type NodeTarget, type Notification } from "../domain"
import * as Snippet from "./snippet"
import * as Strips from "./tabs"
import * as Timeline from "./timeline"

type Builder = HtmlBuilder<Message>

/** A notification shows until its time is up, and again on hover when it may. */
const visibilityFor =
  (model: Model, target: NodeTarget) =>
  (notification: Notification): boolean =>
    isNotificationVisible(
      notification,
      model.expiredNotifications,
      Option.exists(model.maybeHovered, (hovered) =>
        sameTarget(hovered, target),
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
              ...(Array.isReadonlyArrayEmpty(example.steps)
                ? []
                : [
                    h.div(
                      [h.Class("flex flex-wrap justify-center gap-6")],
                      Array.map(example.steps, (step, index) =>
                        h.keyed("div")(
                          stepKeyOf(model.exampleKey, index),
                          [],
                          [
                            Node.view(
                              {
                                id: stepKeyOf(model.exampleKey, index),
                                state:
                                  model.steps[
                                    stepKeyOf(model.exampleKey, index)
                                  ] ?? idle,
                                label: step.label,
                                target: { _tag: "Step", index },
                                isNotificationVisible: visibilityFor(model, {
                                  _tag: "Step",
                                  index,
                                }),
                              },
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
              Node.view(
                {
                  id: RESULT_ID,
                  state: model.run,
                  label: "result",
                  target: { _tag: "Result" },
                  isNotificationVisible: visibilityFor(model, {
                    _tag: "Result",
                  }),
                },
                h,
              ),
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
          Header.view(
            example,
            model.run,
            model.hasInteracted,
            model.headerPointer,
            h,
          ),
          h.div(
            [h.Role("status"), h.AriaLive("polite"), h.Class("sr-only")],
            [
              model.run._tag === "Idle"
                ? ""
                : `${example.title} ${describe(model.run)}`,
            ],
          ),
          Config.view(
            example,
            {
              exampleKey: key,
              valueOf: (control) =>
                controlValueOf(model.controls, key, control),
              groupOf: (control) =>
                model.controlGroups[controlGroupKey(key, control.id)] ??
                RadioGroup.init({ id: controlGroupId(key, control.id) }),
            },
            isDied,
            h,
          ),
          nodesView(model, isDied, h),
          example.features.finalizers ? Finalizers.view(model, h) : h.empty,
          example.features.timeline ? Timeline.view(model, h) : h.empty,
          Snippet.view(
            example.code.resolve(model.controls[key] ?? {}).source,
            model.maybeHighlighted,
            {
              maybeRect: model.maybeHighlightRect,
              isVisible: model.isHighlightVisible,
            },
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
      Strips.categories(
        model,
        Strips.examples(model, surfaceView(model, h), h),
        h,
      ),
    ],
  )
