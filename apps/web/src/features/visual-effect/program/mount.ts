import { Effect, Queue, Stream } from "effect"
import { Mount } from "foldkit"
import { startChevronPulse } from "./drivers/layout-animation"
import { Message } from "./message"
import { Strip } from "./model"
import { dragScroll, watchRightEdge } from "./drivers/strip"

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

const stripStream = (element: HTMLElement, strip: Strip) =>
  Stream.callback<typeof Message.UpdatedStripFade.Type>((queue) =>
    Effect.acquireRelease(
      Effect.sync(() => {
        const stopDrag = dragScroll(element)
        const stopWatching = watchRightEdge(element, (canScrollRight) =>
          Queue.offerUnsafe(
            queue,
            Message.UpdatedStripFade({ strip, canScrollRight }),
          ),
        )
        return () => {
          stopDrag()
          stopWatching()
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

/** Pulses the chevrons of the finalizer panel. */
export const PulseChevrons = Mount.define("PulseChevrons", {
  messages: [Message.CompletedPulseChevrons],
  execute: ({ element }) =>
    Effect.acquireRelease(
      Effect.sync(() => startChevronPulse(element as HTMLElement)),
      (stop) => Effect.sync(stop),
    ).pipe(Effect.as(Message.CompletedPulseChevrons())),
})
