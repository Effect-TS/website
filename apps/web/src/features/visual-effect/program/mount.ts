import { Effect, Queue, Schema, Stream } from "effect"
import { Mount } from "foldkit"
import { startAnimation } from "./animation"
import { startBubble } from "./bubble-animation"
import {
  startCardAnimation,
  startChevronPulse,
  startHighlightAnimation,
} from "./layout-animation"
import { startHeaderAnimation } from "./header-animation"
import { FinalizerPhase } from "./domain"
import { Message } from "./message"
import { Strip } from "./model"
import {
  HEADER_ID,
  HIGHLIGHT_ID,
  NodeTagSchema,
  PointerSchema,
  bubbles,
  cards,
  header,
  highlights,
  nodes,
} from "./motion"

const widthStream = (element: Element) =>
  Stream.callback<typeof Message.UpdatedContainerWidth.Type>((queue) =>
    Effect.acquireRelease(
      Effect.sync(() => {
        const observer = new ResizeObserver(() => {
          Queue.offerUnsafe(
            queue,
            Message.UpdatedContainerWidth({
              width: (element as HTMLElement).offsetWidth,
            }),
          )
        })
        observer.observe(element)
        Queue.offerUnsafe(
          queue,
          Message.UpdatedContainerWidth({
            width: (element as HTMLElement).offsetWidth,
          }),
        )
        return observer
      }),
      (observer) => Effect.sync(() => observer.disconnect()),
    ).pipe(Effect.flatMap(() => Effect.never)),
  )

/** Tells the Program how wide the panel is, now and whenever it resizes. */
export const MeasureWidth = Mount.defineStream("MeasureWidth", {
  messages: [Message.UpdatedContainerWidth],
  execute: ({ element }) => widthStream(element),
})

/** Starts the animation of a node. It lives as long as the node. A Command gives it each new state. */
export const AnimateNode = Mount.define("AnimateNode", {
  args: { id: Schema.String, tag: NodeTagSchema },
  messages: [Message.CompletedAnimateNode],
  execute: ({ element, id, tag }) =>
    Effect.acquireRelease(
      Effect.sync(() => {
        const animation = startAnimation(element as HTMLElement, tag)
        const unregister = nodes.register(id, animation)
        return { animation, unregister }
      }),
      ({ animation, unregister }) =>
        Effect.sync(() => {
          unregister()
          animation.dispose()
        }),
    ).pipe(Effect.as(Message.CompletedAnimateNode())),
})

const DRAG_THRESHOLD_PX = 6

const stripStream = (element: HTMLElement, strip: Strip) =>
  Stream.callback<typeof Message.UpdatedStripFade.Type>((queue) =>
    Effect.acquireRelease(
      Effect.sync(() => {
        const drag = {
          pointerId: -1,
          startX: 0,
          startScrollLeft: 0,
          moved: false,
        }
        let canScrollRight: boolean | undefined = undefined

        const report = (): void => {
          const next =
            element.scrollLeft < element.scrollWidth - element.clientWidth - 1
          if (next !== canScrollRight) {
            canScrollRight = next
            Queue.offerUnsafe(
              queue,
              Message.UpdatedStripFade({ strip, canScrollRight: next }),
            )
          }
        }
        const onPointerDown = (event: PointerEvent): void => {
          if (event.button !== 0) return
          drag.pointerId = event.pointerId
          drag.startX = event.clientX
          drag.startScrollLeft = element.scrollLeft
          drag.moved = false
        }
        const onPointerMove = (event: PointerEvent): void => {
          if (drag.pointerId !== event.pointerId) return
          const delta = event.clientX - drag.startX
          if (!drag.moved && Math.abs(delta) > DRAG_THRESHOLD_PX) {
            drag.moved = true
            element.setPointerCapture(event.pointerId)
          }
          if (drag.moved) {
            element.scrollLeft = drag.startScrollLeft - delta
          }
        }
        const onPointerEnd = (event: PointerEvent): void => {
          if (drag.pointerId !== event.pointerId) return
          if (element.hasPointerCapture(event.pointerId)) {
            element.releasePointerCapture(event.pointerId)
          }
          drag.pointerId = -1
        }
        /** A drag is not a click on the tab it ends on. */
        const onClickCapture = (event: MouseEvent): void => {
          if (drag.moved) {
            event.preventDefault()
            event.stopPropagation()
            drag.moved = false
          }
        }

        const resize = new ResizeObserver(report)
        const mutation = new MutationObserver(report)
        resize.observe(element)
        mutation.observe(element, { childList: true, subtree: true })
        element.addEventListener("pointerdown", onPointerDown)
        element.addEventListener("pointermove", onPointerMove)
        element.addEventListener("pointerup", onPointerEnd)
        element.addEventListener("pointercancel", onPointerEnd)
        element.addEventListener("click", onClickCapture, true)
        element.addEventListener("scroll", report)
        report()

        return () => {
          resize.disconnect()
          mutation.disconnect()
          element.removeEventListener("pointerdown", onPointerDown)
          element.removeEventListener("pointermove", onPointerMove)
          element.removeEventListener("pointerup", onPointerEnd)
          element.removeEventListener("pointercancel", onPointerEnd)
          element.removeEventListener("click", onClickCapture, true)
          element.removeEventListener("scroll", report)
        }
      }),
      (dispose) => Effect.sync(dispose),
    ).pipe(Effect.flatMap(() => Effect.never)),
  )

/** Lets a tab strip scroll by drag, and tells the Program whether it has more tabs on the right. */
export const ScrollStrip = Mount.defineStream("ScrollStrip", {
  args: { strip: Strip },
  messages: [Message.UpdatedStripFade],
  execute: ({ element, strip }) => stripStream(element as HTMLElement, strip),
})

/** Starts the animation of the play, stop and reset button. A Command gives it each new state. */
export const AnimateHeader = Mount.define("AnimateHeader", {
  args: {
    tag: NodeTagSchema,
    hasInteracted: Schema.Boolean,
    pointer: PointerSchema,
  },
  messages: [Message.CompletedAnimateHeader],
  execute: ({ element, tag, hasInteracted, pointer }) =>
    Effect.acquireRelease(
      Effect.sync(() => {
        const animation = startHeaderAnimation(element as HTMLElement, {
          tag,
          hasInteracted,
          pointer,
        })
        const unregister = header.register(HEADER_ID, animation)
        return { animation, unregister }
      }),
      ({ animation, unregister }) =>
        Effect.sync(() => {
          unregister()
          animation.dispose()
        }),
    ).pipe(Effect.as(Message.CompletedAnimateHeader())),
})

/** Starts the shake of a failure or death bubble. A Command tells it when the bubble shows or hides. */
export const ShakeBubble = Mount.define("ShakeBubble", {
  args: {
    id: Schema.Number,
    tone: Schema.Literals(["failure", "death"]),
    isVisible: Schema.Boolean,
  },
  messages: [Message.CompletedShakeBubble],
  execute: ({ element, id, tone, isVisible }) =>
    Effect.acquireRelease(
      Effect.sync(() => {
        const animation = startBubble(element as HTMLElement, tone, isVisible)
        const unregister = bubbles.register(String(id), animation)
        return { animation, unregister }
      }),
      ({ animation, unregister }) =>
        Effect.sync(() => {
          unregister()
          animation.dispose()
        }),
    ).pipe(Effect.as(Message.CompletedShakeBubble())),
})

/** Starts the spring of a finalizer card. A Command gives it each new place and phase. */
export const AnimateFinalizerCard = Mount.define("AnimateFinalizerCard", {
  args: {
    id: Schema.String,
    x: Schema.Number,
    scale: Schema.Number,
    phase: FinalizerPhase,
  },
  messages: [Message.CompletedAnimateFinalizerCard],
  execute: ({ element, id, x, scale, phase }) =>
    Effect.acquireRelease(
      Effect.sync(() => {
        const animation = startCardAnimation(element as HTMLElement, {
          x,
          scale,
          phase,
        })
        const unregister = cards.register(id, animation)
        return { animation, unregister }
      }),
      ({ animation, unregister }) =>
        Effect.sync(() => {
          unregister()
          animation.dispose()
        }),
    ).pipe(Effect.as(Message.CompletedAnimateFinalizerCard())),
})

/** Starts the spring of the highlight box. A Command gives it each new target. */
export const AnimateHighlight = Mount.define("AnimateHighlight", {
  args: {
    x: Schema.Number,
    y: Schema.Number,
    width: Schema.Number,
    height: Schema.Number,
    isVisible: Schema.Boolean,
  },
  messages: [Message.CompletedAnimateHighlight],
  execute: ({ element, ...input }) =>
    Effect.acquireRelease(
      Effect.sync(() => {
        const animation = startHighlightAnimation(element as HTMLElement, input)
        const unregister = highlights.register(HIGHLIGHT_ID, animation)
        return { animation, unregister }
      }),
      ({ animation, unregister }) =>
        Effect.sync(() => {
          unregister()
          animation.dispose()
        }),
    ).pipe(Effect.as(Message.CompletedAnimateHighlight())),
})

/** Pulses the chevrons of the finalizer panel. */
export const PulseChevrons = Mount.define("PulseChevrons", {
  messages: [Message.CompletedPulseChevrons],
  execute: ({ element }) =>
    Effect.acquireRelease(
      Effect.sync(() => startChevronPulse(element as HTMLElement)),
      (stop) => Effect.sync(stop),
    ).pipe(Effect.as(Message.CompletedPulseChevrons())),
})
