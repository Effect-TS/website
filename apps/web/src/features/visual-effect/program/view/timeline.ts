import { Array } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"
import { MeasureWidth } from "../mount"
import type { Message } from "../message"
import type { Model } from "../model"
import { TIMELINE, layoutTimeline, type SegmentLayout } from "../timeline"

type Builder = HtmlBuilder<Message>

const px = (value: number): string => `${value}px`

const lineColor = (segment: SegmentLayout): string =>
  segment.kind === "Running"
    ? segment.isActive
      ? "var(--color-blue-400)"
      : "var(--color-blue-500)"
    : segment.isActive
      ? "var(--color-neutral-500)"
      : "var(--color-neutral-600)"

const dot = (left: number, color: string, h: Builder): Html =>
  h.div(
    [
      h.Class("absolute rounded-full transition-colors duration-200"),
      h.Style({
        left: px(left - TIMELINE.dotSize / 2),
        width: px(TIMELINE.dotSize),
        height: px(TIMELINE.dotSize),
        top: "39%",
        transform: "translateY(-50%)",
        zIndex: "2",
        backgroundColor: color,
      }),
    ],
    [],
  )

const segmentView = (segment: SegmentLayout, index: number, h: Builder): Html =>
  h.keyed("div")(
    `segment-${index}`,
    [],
    [
      h.div(
        [
          h.Class(
            `absolute transition-colors duration-200 ${segment.kind === "Waiting" ? "rounded-full" : ""}`,
          ),
          h.Style({
            left: px(segment.visibleLeft),
            width: px(segment.visibleWidth),
            height: px(TIMELINE.lineThickness),
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: "1",
            backgroundColor: lineColor(segment),
          }),
        ],
        [],
      ),
      ...(segment.kind === "Running"
        ? [dot(segment.left, lineColor(segment), h)]
        : []),
      ...(segment.kind === "Running" && segment.isEnded && segment.width > 0
        ? [dot(segment.left + segment.width, "var(--color-blue-500)", h)]
        : []),
      ...(segment.kind === "Waiting" &&
      segment.width > 56 &&
      segment.durationMs > 0
        ? [
            h.div(
              [
                h.Class("pointer-events-none absolute"),
                h.Style({
                  left: px(segment.left + segment.width / 2),
                  top: px(TIMELINE.height / 2),
                  transform: "translate(-50%, -50%)",
                  zIndex: "3",
                }),
              ],
              [
                h.div(
                  [
                    h.Class(
                      "rounded border border-neutral-700 bg-neutral-900/90 px-2 py-0.5 font-mono text-xs whitespace-nowrap text-neutral-300",
                    ),
                  ],
                  [`${Math.max(0, Math.round(segment.durationMs))}ms`],
                ),
              ],
            ),
          ]
        : []),
    ],
  )

export const view = (model: Model, h: Builder): Html => {
  const layout = layoutTimeline({
    run: model.run,
    segments: model.timeline,
    clock: model.clock,
    containerWidth: model.containerWidth,
  })
  return h.div(
    [
      h.DataAttribute("testid", "visual-effect-timeline"),
      h.Class("border-b border-zinc-800 bg-zinc-950/80"),
    ],
    [
      h.div(
        [
          h.Class("relative w-full overflow-hidden"),
          h.Style({ height: px(TIMELINE.height) }),
          h.OnMount(MeasureWidth()),
        ],
        [
          h.div(
            [
              h.Class("absolute right-0 left-0"),
              h.Style({
                height: px(TIMELINE.lineThickness),
                top: "50%",
                transform: "translateY(-50%)",
                backgroundColor: "var(--color-zinc-700)",
              }),
            ],
            [],
          ),
          ...Array.map(layout.tickLefts, (left, index) =>
            h.keyed("div")(
              `tick-${index}`,
              [
                h.Class("pointer-events-none absolute top-0 bottom-0"),
                h.Style({
                  left: px(left),
                  width: "1px",
                  backgroundColor: "var(--color-zinc-700)",
                }),
              ],
              [],
            ),
          ),
          ...Array.map(layout.segments, (segment, index) =>
            segmentView(segment, index, h),
          ),
          h.div(
            [
              h.Class(
                `absolute top-0 bottom-0 transition-colors duration-200 ${model.run._tag === "Running" ? "bg-white" : "bg-neutral-500"}`,
              ),
              h.Style({
                width: px(TIMELINE.cursorWidth),
                zIndex: "4",
                left: px(layout.cursorLeft),
              }),
            ],
            [],
          ),
        ],
      ),
    ],
  )
}
