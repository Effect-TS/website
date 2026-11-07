import { Effect, Queue, Stream } from "effect"
import { Mount } from "foldkit"
import { Message } from "./message"

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
