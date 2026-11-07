import { Effect, Queue, Schema, Stream } from "effect"
import { Mount } from "foldkit"
import { startAnimation } from "./animation"
import { startBubbleShake } from "./bubble-animation"
import {
  startCardAnimation,
  startChevronPulse,
  startHighlightAnimation,
} from "./layout-animation"
import { startHeaderAnimation } from "./header-animation"
import { Message } from "./message"
import { Strip } from "./model"

const widthStream = (element: Element) =>
  Stream.callback<typeof Message.ChangedContainerWidth.Type>((queue) =>
    Effect.acquireRelease(
      Effect.sync(() => {
        const observer = new ResizeObserver(() => {
          Queue.offerUnsafe(
            queue,
            Message.ChangedContainerWidth({
              width: (element as HTMLElement).offsetWidth,
            }),
          )
        })
        observer.observe(element)
        Queue.offerUnsafe(
          queue,
          Message.ChangedContainerWidth({
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
  messages: [Message.ChangedContainerWidth],
  execute: ({ element }) => widthStream(element),
})

/** Animates a node from its `data-state`. It lives as long as the node. */
export const AnimateNode = Mount.define("AnimateNode", {
  messages: [Message.CompletedAnimateNode],
  execute: ({ element }) =>
    Effect.acquireRelease(
      Effect.sync(() => startAnimation(element as HTMLElement)),
      (animation) => Effect.sync(() => animation.dispose()),
    ).pipe(Effect.as(Message.CompletedAnimateNode())),
})

const DRAG_THRESHOLD_PX = 6

const stripStream = (element: HTMLElement, strip: Strip) =>
  Stream.callback<typeof Message.ChangedStripFade.Type>((queue) =>
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
              Message.ChangedStripFade({ strip, canScrollRight: next }),
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
  messages: [Message.ChangedStripFade],
  execute: ({ element, strip }) => stripStream(element as HTMLElement, strip),
})

/** Animates the play, stop and reset button from its `data-state`. */
export const AnimateHeader = Mount.define("AnimateHeader", {
  messages: [Message.CompletedAnimateHeader],
  execute: ({ element }) =>
    Effect.acquireRelease(
      Effect.sync(() => startHeaderAnimation(element as HTMLElement)),
      (animation) => Effect.sync(() => animation.dispose()),
    ).pipe(Effect.as(Message.CompletedAnimateHeader())),
})

/** Shakes a failure or death bubble when it appears. */
export const ShakeBubble = Mount.define("ShakeBubble", {
  args: { tone: Schema.Literals(["failure", "death"]) },
  messages: [Message.CompletedShakeBubble],
  execute: ({ element, tone }) =>
    Effect.acquireRelease(
      Effect.sync(() => startBubbleShake(element as HTMLElement, tone)),
      (stop) => Effect.sync(stop),
    ).pipe(Effect.as(Message.CompletedShakeBubble())),
})

/** Slides a finalizer card to its place with a spring, and pulses it while it runs. */
export const AnimateFinalizerCard = Mount.define("AnimateFinalizerCard", {
  messages: [Message.CompletedAnimateFinalizerCard],
  execute: ({ element }) =>
    Effect.acquireRelease(
      Effect.sync(() => startCardAnimation(element as HTMLElement)),
      (stop) => Effect.sync(stop),
    ).pipe(Effect.as(Message.CompletedAnimateFinalizerCard())),
})

/** Slides the highlight box along the code with a spring. */
export const AnimateHighlight = Mount.define("AnimateHighlight", {
  messages: [Message.CompletedAnimateHighlight],
  execute: ({ element }) =>
    Effect.acquireRelease(
      Effect.sync(() => startHighlightAnimation(element as HTMLElement)),
      (stop) => Effect.sync(stop),
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
