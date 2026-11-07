import { Array, Option, Record } from "effect"
import {
  ChangeBubble,
  ChangeCard,
  ChangeHeader,
  ChangeHighlight,
  ChangeNode,
} from "./command"
import {
  idle,
  isNotificationVisible,
  notificationOf,
  sameTarget,
  type NodeTarget,
  type Notification,
  type RunState,
} from "./domain"
import { findEntry, stepKeyOf } from "./catalog"
import { layoutFinalizers } from "./finalizers"
import type { Model } from "./model"
import { RESULT_ID } from "./motion"
import { CardKey } from "./targets/card"
import { NodeKey } from "./targets/node"

type Commands = ReadonlyArray<
  | ReturnType<typeof ChangeBubble>
  | ReturnType<typeof ChangeNode>
  | ReturnType<typeof ChangeHeader>
  | ReturnType<typeof ChangeCard>
  | ReturnType<typeof ChangeHighlight>
>

export const cardScale = (isRunning: boolean): number => (isRunning ? 1.05 : 1)

const nodeCommands = (previous: Model, next: Model): Commands => {
  if (previous.exampleKey !== next.exampleKey) {
    return []
  }
  const keys = Array.dedupe([
    ...Record.keys(previous.steps),
    ...Record.keys(next.steps),
  ])
  const steps = Array.flatMap(keys, (key) => {
    const before = previous.steps[key] ?? idle
    const after = next.steps[key] ?? idle
    return before._tag === after._tag
      ? []
      : [ChangeNode({ id: NodeKey.make(key), tag: after._tag })]
  })
  const result =
    previous.run._tag === next.run._tag
      ? []
      : [ChangeNode({ id: NodeKey.make(RESULT_ID), tag: next.run._tag })]
  return [...steps, ...result]
}

const headerCommands = (previous: Model, next: Model): Commands =>
  previous.run._tag === next.run._tag &&
  previous.hasInteracted === next.hasInteracted &&
  previous.headerPointer === next.headerPointer
    ? []
    : [
        ChangeHeader({
          tag: next.run._tag,
          hasInteracted: next.hasInteracted,
          pointer: next.headerPointer,
        }),
      ]

const cardCommands = (previous: Model, next: Model): Commands => {
  const before = layoutFinalizers(previous.finalizers, previous.containerWidth)
  return Array.flatMap(
    layoutFinalizers(next.finalizers, next.containerWidth),
    ({ entry, x, isRunning }) => {
      const scale = cardScale(isRunning)
      const was = Array.findFirst(
        before,
        ({ entry: { id } }) => id === entry.id,
      )
      return Option.isSome(was) &&
        was.value.x === x &&
        cardScale(was.value.isRunning) === scale &&
        was.value.entry.phase === entry.phase
        ? []
        : [
            ChangeCard({
              id: CardKey.make(entry.id),
              x,
              scale,
              phase: entry.phase,
            }),
          ]
    },
  )
}

const highlightCommands = (previous: Model, next: Model): Commands =>
  Option.match(next.maybeHighlightRect, {
    onNone: () => [],
    onSome: (rect) =>
      Option.exists(
        previous.maybeHighlightRect,
        (was) =>
          was.x === rect.x &&
          was.y === rect.y &&
          was.width === rect.width &&
          was.height === rect.height,
      ) && previous.isHighlightVisible === next.isHighlightVisible
        ? []
        : [ChangeHighlight({ ...rect, isVisible: next.isHighlightVisible })],
  })

interface Slot {
  readonly target: NodeTarget
  readonly state: RunState
}

const slotsOf = (model: Model): ReadonlyArray<Slot> =>
  Option.match(findEntry(model.exampleKey), {
    onNone: () => [],
    onSome: ({ example }) => [
      ...Array.makeBy(example.steps.length, (index): Slot => ({
        target: { _tag: "Step", index },
        state: model.steps[stepKeyOf(model.exampleKey, index)] ?? idle,
      })),
      { target: { _tag: "Result" }, state: model.run },
    ],
  })

const isShown = (
  model: Model,
  target: NodeTarget,
  notification: Notification,
) =>
  isNotificationVisible(
    notification,
    model.expiredNotifications,
    Option.exists(model.maybeHovered, (hovered) => sameTarget(hovered, target)),
  )

const shakes = (state: RunState): boolean =>
  state._tag === "Failed" || state._tag === "Died"

/** A bubble that stays on screen shakes again when it comes back. */
const bubbleCommands = (previous: Model, next: Model): Commands => {
  const before = slotsOf(previous)
  return Array.flatMap(slotsOf(next), ({ target, state }) =>
    Option.match(shakes(state) ? notificationOf(state) : Option.none(), {
      onNone: () => [],
      onSome: (notification) => {
        const was = Array.findFirst(before, (slot) =>
          sameTarget(slot.target, target),
        ).pipe(
          Option.flatMap(({ state: old }) => notificationOf(old)),
          Option.filter(({ id }) => id === notification.id),
        )
        const isVisible = isShown(next, target, notification)
        return Option.exists(
          was,
          (old) => isShown(previous, target, old) !== isVisible,
        )
          ? [ChangeBubble({ id: notification.id, isVisible })]
          : []
      },
    }),
  )
}

/** What the screen has to do because the Model changed. The Commands tell the drivers of the Mounts. */
export const motionCommands = (previous: Model, next: Model): Commands => [
  ...nodeCommands(previous, next),
  ...headerCommands(previous, next),
  ...cardCommands(previous, next),
  ...highlightCommands(previous, next),
  ...bubbleCommands(previous, next),
]
