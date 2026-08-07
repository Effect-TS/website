import * as DateTime from "effect/DateTime"
import { motion } from "motion/react"
import * as React from "react"
import type {
  TimelineSegment,
  VisualEffectScheduleTimeline,
  VisualEffectState,
} from "@/features/visual-effect/model/domain"
import { useContainerWidth } from "@/features/visual-effect/hooks/useContainerWidth"
import { cn } from "@/lib/utils"
import {
  useExampleState,
  useScheduleTime,
  useScheduleTimeline,
} from "./VisualEffectProvider"

const TIMELINE_CONFIG = {
  clearDelayMs: 300,
  cursorWidth: 3,
  dotSize: 12,
  lineDotGap: 1,
  // Place dots slightly above the mathematical center so their visual weight
  // sits on the line instead of hanging below it
  dotTopOffset: "39%",
  height: 50,
  lineThickness: 3,
  pixelsPerSecond: 100,
  scrollBuffer: 240,
  scrollThreshold: 0.8,
  startOffset: 50,
  tickMarkSpacing: 50,
} as const

const TIMELINE_COLORS = {
  backgroundLine: "var(--color-zinc-700)",
  cursorActive: "var(--color-white)",
  cursorInactive: "var(--color-neutral-500)",
  gapActive: "var(--color-neutral-500)",
  gapInactive: "var(--color-neutral-600)",
  runningActive: "var(--color-blue-400)",
  runningInactive: "var(--color-blue-500)",
  tickMark: "var(--color-zinc-700)",
} as const

export function VisualEffectScheduleTimeline() {
  const { containerRef, containerWidth } = useContainerWidth()
  const exampleState = useExampleState()
  const currentTime = useScheduleTime()
  const timeline = useScheduleTimeline()

  const currentTimeMillis = getCurrentTimeMillis(
    exampleState,
    timeline,
    currentTime,
  )
  const timelineOriginMillis = getTimelineOriginMillis(
    exampleState,
    timeline,
    currentTimeMillis,
  )
  const cursorPosition = getCursorPosition(
    exampleState,
    currentTimeMillis,
    timelineOriginMillis,
  )
  const scrollOffset = getScrollOffset(containerWidth, cursorPosition)
  const totalWidth =
    containerWidth + scrollOffset + TIMELINE_CONFIG.scrollBuffer
  const tickCount = Math.max(
    0,
    Math.ceil(totalWidth / TIMELINE_CONFIG.tickMarkSpacing),
  )

  return (
    <div className="border-b border-zinc-800 bg-zinc-950/80">
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden"
        style={{ height: TIMELINE_CONFIG.height }}
      >
        <div
          className="absolute right-0 left-0"
          style={{
            height: TIMELINE_CONFIG.lineThickness,
            top: "50%",
            transform: "translateY(-50%)",
            backgroundColor: TIMELINE_COLORS.backgroundLine,
          }}
        />

        {Array.from({ length: tickCount }, (_, index) => {
          const x = (index + 1) * TIMELINE_CONFIG.tickMarkSpacing - scrollOffset

          return (
            <div
              key={`tick-${index.toString()}`}
              className="pointer-events-none absolute top-0 bottom-0"
              style={{
                left: `${x}px`,
                width: 1,
                backgroundColor: TIMELINE_COLORS.tickMark,
              }}
            />
          )
        })}

        {timeline.map((segment) => {
          const {
            durationMillis,
            left,
            lineColor,
            visibleLeft,
            visibleWidth,
            width,
          } = getSegmentConfig({
            state: exampleState,
            segment,
            scrollOffset,
            timelineOriginMillis,
            currentTimeMillis,
          })

          return (
            <React.Fragment key={segment.id}>
              <motion.div
                className={cn(
                  "absolute",
                  segment.kind === "Waiting" && "rounded-full",
                )}
                style={{
                  left: `${visibleLeft}px`,
                  width: `${visibleWidth}px`,
                  height: TIMELINE_CONFIG.lineThickness,
                  top: "50%",
                  transform: "translateY(-50%)",
                  zIndex: 1,
                }}
                animate={{
                  backgroundColor: lineColor,
                  opacity: 1,
                  width: `${visibleWidth}px`,
                }}
                transition={{
                  backgroundColor: { duration: 0.24, ease: "easeOut" },
                  opacity: { duration: 0.3, ease: "easeInOut" },
                  width: { duration: 0 },
                }}
              />

              {segment.kind === "Running" && (
                <motion.div
                  className="absolute rounded-full"
                  style={{
                    left: `${left - TIMELINE_CONFIG.dotSize / 2}px`,
                    width: TIMELINE_CONFIG.dotSize,
                    height: TIMELINE_CONFIG.dotSize,
                    top: TIMELINE_CONFIG.dotTopOffset,
                    transform: "translateY(-50%)",
                    zIndex: 2,
                  }}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{
                    backgroundColor: lineColor,
                    opacity: 1,
                    scale: 1,
                  }}
                  transition={{
                    backgroundColor: { duration: 0.24, ease: "easeOut" },
                    opacity: { duration: 0.3, ease: "easeInOut" },
                    scale: {
                      type: "spring",
                      bounce: 0.35,
                      visualDuration: 0.4,
                    },
                  }}
                />
              )}

              {segment.kind === "Running" &&
                segment.endedAt !== undefined &&
                width > 0 && (
                  <motion.div
                    className="absolute rounded-full"
                    style={{
                      left: `${left + width - TIMELINE_CONFIG.dotSize / 2}px`,
                      width: TIMELINE_CONFIG.dotSize,
                      height: TIMELINE_CONFIG.dotSize,
                      top: TIMELINE_CONFIG.dotTopOffset,
                      transform: "translateY(-50%)",
                      zIndex: 2,
                    }}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{
                      backgroundColor: TIMELINE_COLORS.runningInactive,
                      opacity: 1,
                      scale: 1,
                    }}
                    transition={{
                      backgroundColor: { duration: 0.24, ease: "easeOut" },
                      opacity: { duration: 0.3, ease: "easeInOut" },
                      scale: {
                        type: "spring",
                        bounce: 0.35,
                        visualDuration: 0.4,
                      },
                    }}
                  />
                )}

              {segment.kind === "Waiting" &&
                width > 56 &&
                durationMillis > 0 && (
                  <div
                    className="pointer-events-none absolute"
                    style={{
                      left: `${left + width / 2}px`,
                      top: `${TIMELINE_CONFIG.height / 2}px`,
                      transform: "translate(-50%, -50%)",
                      zIndex: 3,
                    }}
                  >
                    <motion.div
                      className="rounded border border-neutral-700 bg-neutral-900/90 px-2 py-0.5 font-mono text-xs whitespace-nowrap text-neutral-300"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        opacity: { duration: 0.2, ease: "easeOut" },
                        scale: { duration: 0.2, ease: "easeOut" },
                      }}
                    >
                      {formatDuration(durationMillis)}
                    </motion.div>
                  </div>
                )}
            </React.Fragment>
          )
        })}

        <motion.div
          className="absolute top-0 bottom-0"
          style={{
            width: TIMELINE_CONFIG.cursorWidth,
            zIndex: 4,
          }}
          animate={{
            backgroundColor:
              exampleState._tag === "Running"
                ? TIMELINE_COLORS.cursorActive
                : TIMELINE_COLORS.cursorInactive,
            left: `${cursorPosition - scrollOffset}px`,
          }}
          transition={{
            backgroundColor: { duration: 0.24, ease: "easeOut" },
            left: {
              duration: exampleState._tag === "Running" ? 0.05 : 0.16,
              ease: "linear",
            },
            opacity: { duration: 0.3, ease: "easeInOut" },
          }}
        />
      </div>
    </div>
  )
}

const formatDuration = (durationMs: number): string =>
  `${Math.max(0, Math.round(durationMs))}ms`

const getCurrentTimeMillis = (
  state: VisualEffectState,
  segments: VisualEffectScheduleTimeline,
  currentTime: number,
): number => {
  if (state._tag === "Running") {
    return currentTime
  }
  if (state._tag !== "Idle") {
    return DateTime.toEpochMillis(state.endedAt)
  }
  const lastSegment = segments[segments.length - 1]
  if (lastSegment) {
    return DateTime.toEpochMillis(lastSegment.endedAt ?? lastSegment.startedAt)
  }
  return currentTime
}

const getTimelineOriginMillis = (
  state: VisualEffectState,
  segments: VisualEffectScheduleTimeline,
  currentTimeMillis: number,
): number => {
  if (state._tag === "Running") {
    return DateTime.toEpochMillis(state.startedAt)
  }

  const firstSegment = segments[0]

  if (firstSegment !== undefined) {
    return DateTime.toEpochMillis(firstSegment.startedAt)
  }

  return currentTimeMillis
}

const toTimelineX = (
  currentTimeMillis: number,
  startTimeMillis: number,
): number => {
  const delta = currentTimeMillis - startTimeMillis
  const normalizedDelta = (delta / 1_000) * TIMELINE_CONFIG.pixelsPerSecond
  const offsetDelta = normalizedDelta + TIMELINE_CONFIG.startOffset
  return offsetDelta
}

const getCursorPosition = (
  state: VisualEffectState,
  currentTimeMillis: number,
  timelineOriginMillis: number,
): number => {
  if (state._tag === "Idle") {
    return TIMELINE_CONFIG.startOffset
  }

  return toTimelineX(currentTimeMillis, timelineOriginMillis)
}

const getScrollOffset = (
  containerWidth: number,
  cursorPosition: number,
): number => {
  if (containerWidth <= 0) {
    return 0
  }

  const thresholdPosition = containerWidth * TIMELINE_CONFIG.scrollThreshold
  return Math.max(0, cursorPosition - thresholdPosition)
}

const getSegmentConfig = ({
  state,
  segment,
  timelineOriginMillis,
  scrollOffset,
  currentTimeMillis,
}: {
  readonly state: VisualEffectState
  readonly segment: TimelineSegment
  readonly timelineOriginMillis: number
  readonly scrollOffset: number
  readonly currentTimeMillis: number
}) => {
  const isActive = segment.endedAt === undefined && state._tag === "Running"
  const startedAtMillis = DateTime.toEpochMillis(segment.startedAt)
  const endedAtMillis =
    segment.endedAt === undefined
      ? currentTimeMillis
      : DateTime.toEpochMillis(segment.endedAt)
  const durationMillis = endedAtMillis - startedAtMillis

  const startX = toTimelineX(startedAtMillis, timelineOriginMillis)
  const endX = toTimelineX(endedAtMillis, timelineOriginMillis)
  const left = startX - scrollOffset
  const width = Math.max(0, endX - startX)
  const dotInset = TIMELINE_CONFIG.dotSize / 2 + TIMELINE_CONFIG.lineDotGap

  const visibleLeft = segment.kind === "Running" ? left + dotInset : left
  const visibleWidth =
    segment.kind === "Running"
      ? Math.max(
          0,
          width - dotInset - (segment.endedAt !== undefined ? dotInset : 0),
        )
      : width

  const lineColor =
    segment.kind === "Running"
      ? isActive
        ? TIMELINE_COLORS.runningActive
        : TIMELINE_COLORS.runningInactive
      : isActive
        ? TIMELINE_COLORS.gapActive
        : TIMELINE_COLORS.gapInactive

  return {
    durationMillis,
    left,
    lineColor,
    visibleLeft,
    visibleWidth,
    width,
  }
}
