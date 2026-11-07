import { Tabs } from "@foldkit/ui"
import { Array, Option } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"
import { controlValueOf, findEntry } from "../catalog"
import { Message } from "../message"
import { controlTabsId, controlTabsKey, type Model } from "../model"
import { stepKeyOf } from "../catalog"
import { idle, isNotificationVisible } from "../domain"
import { configView } from "./config"
import { headerView } from "./header"
import { finalizersView } from "./finalizers"
import { arrowRight } from "./icons"
import { nodeView } from "./node"
import { sameTarget, type NodeTarget, type Notification } from "../domain"
import { snippetView } from "./snippet"
import { categoryTabsView, exampleTabsView } from "./tabs"
import { timelineView } from "./timeline"

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
                              {
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
              nodeView(
                {
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
          headerView(example, model.run, model.hasInteracted, h),
          configView(
            example,
            {
              exampleKey: key,
              valueOf: (control) =>
                controlValueOf(model.controls, key, control),
              tabsOf: (control) =>
                model.controlTabs[controlTabsKey(key, control.id)] ??
                Tabs.init({ id: controlTabsId(key, control.id) }),
            },
            isDied,
            h,
          ),
          nodesView(model, isDied, h),
          example.features.finalizers ? finalizersView(model, h) : h.empty,
          example.features.timeline ? timelineView(model, h) : h.empty,
          snippetView(
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
      categoryTabsView(
        model,
        exampleTabsView(model, surfaceView(model, h), h),
        h,
      ),
    ],
  )
