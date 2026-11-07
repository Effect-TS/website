import { Array, Option } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"
import { AnimateNode, ShakeBubble } from "../mount"
import { Message } from "../message"
import type { Notification, NodeTarget, RunState } from "../domain"
import { notificationOf } from "../domain"
import { octagonAlert, skull, sparkle } from "./icons"

type Builder = HtmlBuilder<Message>

/** The container of a node. Each state has its own colour, scale and opacity. */
const containerClass = (state: RunState): string => {
  switch (state._tag) {
    case "Idle":
      return "scale-100 bg-black opacity-60"
    case "Running":
      return "scale-95 bg-blue-500 opacity-100"
    case "Succeeded":
      return "scale-100 bg-green-700 opacity-100"
    case "Failed":
      return "scale-100 bg-red-500 opacity-100"
    case "Died":
      return "scale-100 bg-red-900 opacity-100"
    case "Interrupted":
      return "scale-100 bg-orange-500 opacity-100"
  }
}

const borderClass = (state: RunState): string =>
  state._tag === "Died"
    ? "border-2 border-[rgba(220,38,38,0.4)]"
    : "border border-[rgba(255,255,255,0.12)]"

const shadowClass = (state: RunState): string =>
  state._tag === "Running"
    ? "shadow-[0_2px_4px_rgba(0,0,0,0.4),0_0_24px_rgba(59,130,246,0.2)]"
    : "shadow-[0_2px_4px_rgba(0,0,0,0.4)]"

const SHIMMER_COUNT = 6

const contentView = (state: RunState, h: Builder): Html => {
  switch (state._tag) {
    case "Idle":
      return sparkle(h, {
        className: "text-neutral-200",
        isFilled: true,
        size: 28,
      })
    case "Running":
      return h.empty
    case "Succeeded":
      return h.div(
        [h.Class(state.value.size === "Large" ? "text-2xl" : "text-lg")],
        [state.value.text],
      )
    case "Failed":
      return skull(h, { className: "fill-white text-red-500", size: 34 })
    case "Died":
      return skull(h, { className: "fill-red-600 text-red-900", size: 34 })
    case "Interrupted":
      return octagonAlert(h, { className: "text-white", size: 28 })
  }
}

const shimmerView = (index: number, h: Builder): Html =>
  h.keyed("div")(
    `shimmer-${index}`,
    [
      h.DataAttribute("node", "shimmer"),
      h.Class(
        "absolute top-0 bottom-0 left-0 w-[200%] mix-blend-lighten blur-xs bg-[linear-gradient(90deg,transparent_0%,transparent_40%,rgba(255,255,255,0.1)_45%,rgba(255,255,255,0.5)_50%,rgba(255,255,255,0.1)_55%,transparent_60%,transparent_100%)]",
      ),
      h.Style({ transform: "translateX(-66%)" }),
    ],
    [],
  )

/** The parts a Running node adds: a pulsing ring and a shimmer that sweeps over it. */
const runningOverlay = (state: RunState, h: Builder): ReadonlyArray<Html> =>
  state._tag === "Running"
    ? [
        h.keyed("div")(
          "ring",
          [
            h.DataAttribute("node", "ring"),
            h.Class(
              "pointer-events-none absolute inset-0 rounded-lg ring-1 ring-[rgba(100,200,255,0.8)] ring-inset",
            ),
          ],
          [],
        ),
        ...Array.makeBy(SHIMMER_COUNT, (index) => shimmerView(index, h)),
      ]
    : []

type Tone = "info" | "failure" | "death"

const toneOf = (state: RunState): Option.Option<Tone> => {
  switch (state._tag) {
    case "Running":
      return Option.some("info")
    case "Failed":
      return Option.some("failure")
    case "Died":
      return Option.some("death")
    default:
      return Option.none()
  }
}

const bubbleClass = (tone: Tone): string => {
  switch (tone) {
    case "info":
      return "bg-sky-500 text-white shadow-[0_10px_30px_rgba(0,0,0,0.35),0_4px_16px_rgba(14,165,233,0.35)]"
    case "failure":
      return "bg-red-500 text-white shadow-[0_10px_30px_rgba(0,0,0,0.35),0_4px_16px_rgba(239,68,68,0.35)]"
    case "death":
      return "bg-black/95 text-red-500 shadow-[inset_0_0_0_1px_rgba(239,68,68,0.55),0_10px_30px_rgba(0,0,0,0.45),0_4px_16px_rgba(220,38,38,0.18)]"
  }
}

const arrowClass = (tone: Tone): string => {
  switch (tone) {
    case "info":
      return "bg-sky-500"
    case "failure":
      return "bg-red-500"
    case "death":
      return "bg-black/95"
  }
}

const GLITCH_CHARSET = "@#$%&*/=-+?!~<>\\|"
const GLITCH_MIN_LENGTH = 6
const GLITCH_MAX_LENGTH = 16

/** The same notification always garbles the same way, so the view stays pure. */
export const glitchText = (notification: Notification): string => {
  const length = Math.min(
    Math.max(
      Array.fromIterable(notification.message).length,
      GLITCH_MIN_LENGTH,
    ),
    GLITCH_MAX_LENGTH,
  )
  let seed = notification.id + 1
  return Array.makeBy(length, () => {
    seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648
    return GLITCH_CHARSET[seed % GLITCH_CHARSET.length] ?? "#"
  }).join("")
}

const bubbleView = (notification: Notification, tone: Tone, h: Builder): Html =>
  h.keyed("div")(
    `bubble-${notification.id}`,
    [
      h.Role("status"),
      ...(tone === "info" ? [] : [h.OnMount(ShakeBubble({ tone }))]),
      h.Class(
        `pointer-events-none absolute bottom-full left-1/2 z-20 mb-3 max-w-[220px] -translate-x-1/2 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap ${bubbleClass(tone)}`,
      ),
    ],
    [
      tone === "death"
        ? h.span(
            [
              h.AriaLabel(notification.message),
              h.Class(
                "inline-block font-bold tracking-[0.08em] text-red-500 uppercase",
              ),
            ],
            [h.span([h.AriaHidden(true)], [glitchText(notification)])],
          )
        : h.span([], [notification.message]),
      h.div(
        [
          h.Class(
            `absolute top-full left-1/2 size-3 -translate-x-1/2 -translate-y-1.5 rotate-45 rounded-[2px] ${arrowClass(tone)}`,
          ),
        ],
        [],
      ),
    ],
  )

/** A bubble above the node. A node shows it for its notification, and shows it again on hover when it may. */
const notificationView = (
  state: RunState,
  isNotificationVisible: (notification: Notification) => boolean,
  h: Builder,
): ReadonlyArray<Html> =>
  Option.match(
    Option.all({ tone: toneOf(state), notification: notificationOf(state) }),
    {
      onNone: () => [],
      onSome: ({ tone, notification }) =>
        isNotificationVisible(notification)
          ? [bubbleView(notification, tone, h)]
          : [],
    },
  )

export interface NodeInput {
  readonly state: RunState
  readonly label: string
  readonly target: NodeTarget
  readonly isNotificationVisible: (notification: Notification) => boolean
}

/**
 * A node. CSS gives it the colour, scale and opacity of its state. The Mount
 * adds the springs, the jitter and the flash, and reads `data-state`.
 */
export const nodeView = (
  { state, label, target, isNotificationVisible }: NodeInput,
  h: Builder,
): Html =>
  h.div(
    [
      h.DataAttribute("state", state._tag),
      h.OnMount(AnimateNode()),
      h.OnMouseEnter(Message.HoveredNode({ target })),
      h.OnMouseLeave(Message.LeftNode()),
    ],
    [
      h.div(
        [
          h.DataAttribute("node", "outer"),
          h.Class("relative flex h-14 w-14 items-center justify-center"),
        ],
        [
          ...notificationView(state, isNotificationVisible, h),
          h.div(
            [
              h.DataAttribute("node", "container"),
              h.Class(
                `relative h-14 w-14 cursor-auto overflow-hidden rounded-lg transition-[background-color,opacity,scale] duration-100 ${containerClass(state)} ${borderClass(state)} ${shadowClass(state)}`,
              ),
            ],
            [
              ...runningOverlay(state, h),
              h.keyed("div")(
                "flash",
                [
                  h.DataAttribute("node", "flash"),
                  h.Class(
                    "pointer-events-none absolute inset-0 bg-white/80 mix-blend-overlay",
                  ),
                  h.Style({ opacity: "0" }),
                ],
                [],
              ),
              h.keyed("div")(
                "content",
                [
                  h.DataAttribute("node", "content"),
                  h.Class(
                    "absolute inset-0 flex items-center justify-center py-2 font-mono font-bold text-white",
                  ),
                ],
                [
                  h.span(
                    [h.Class("whitespace-nowrap")],
                    [contentView(state, h)],
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
      h.div(
        [
          h.Class(
            "mt-2 text-center font-mono text-xs font-medium text-muted-foreground",
          ),
        ],
        [h.span([], [label])],
      ),
    ],
  )
