import { settle, start, withNotification } from "./run.ts"
import { Option } from "effect"
import { expect, test } from "vite-plus/test"
import {
  emptyFinalizerPanel,
  idle,
  type FinalizerPanel,
  type TimelineSegment,
} from "../../../src/features/visual-effect/program/domain.ts"
import {
  FINALIZER_CARD_WIDTH,
  layoutFinalizers,
} from "../../../src/features/visual-effect/program/finalizers.ts"
import {
  TIMELINE,
  layoutTimeline,
} from "../../../src/features/visual-effect/program/timeline.ts"

const segment = (
  kind: TimelineSegment["kind"],
  startedAt: number,
  endedAt?: number,
): TimelineSegment => ({
  kind,
  startedAt,
  maybeEndedAt: Option.fromNullishOr(endedAt),
})

test("an idle timeline puts the cursor at the start offset and shows ticks", () => {
  const layout = layoutTimeline({
    run: idle,
    segments: [],
    clock: 0,
    containerWidth: 600,
  })
  expect(layout.cursorLeft).toBe(TIMELINE.startOffset)
  expect(layout.segments).toEqual([])
  expect(layout.tickLefts[0]).toBe(TIMELINE.tickMarkSpacing)
  expect(layout.tickLefts).toHaveLength(
    Math.ceil((600 + TIMELINE.scrollBuffer) / TIMELINE.tickMarkSpacing),
  )
})

test("the cursor moves 100px a second from the run start", () => {
  const layout = layoutTimeline({
    run: start(1000),
    segments: [segment("Running", 1000)],
    clock: 3000,
    containerWidth: 600,
  })
  expect(layout.cursorLeft).toBe(250)
  const [only] = layout.segments
  expect(only).toMatchObject({
    kind: "Running",
    isActive: true,
    isEnded: false,
    left: 50,
    width: 200,
    visibleLeft: 50 + TIMELINE.dotSize / 2 + TIMELINE.lineDotGap,
  })
})

test("the view scrolls once the cursor passes 80 percent of the width", () => {
  const layout = layoutTimeline({
    run: start(0),
    segments: [segment("Running", 0)],
    clock: 10_000,
    containerWidth: 500,
  })
  expect(layout.cursorLeft).toBe(500 * TIMELINE.scrollThreshold)
})

test("an ended segment closes its dot and keeps its duration", () => {
  const layout = layoutTimeline({
    run: start(0),
    segments: [segment("Running", 0, 400), segment("Waiting", 400)],
    clock: 1000,
    containerWidth: 600,
  })
  expect(layout.segments[0]).toMatchObject({
    isEnded: true,
    durationMs: 400,
    width: 40,
  })
  expect(layout.segments[1]).toMatchObject({
    kind: "Waiting",
    isActive: true,
    durationMs: 600,
  })
})

const entry = (
  id: string,
  phase: FinalizerPanel["finalizers"][number]["phase"],
): FinalizerPanel["finalizers"][number] => ({
  id,
  label: id,
  registrationIndex: 0,
  registeredAt: 0,
  phase,
  maybeStartedAt: Option.none(),
  maybeEndedAt: Option.none(),
})

test("finalizers wait until the width is known", () => {
  expect(layoutFinalizers(emptyFinalizerPanel, 0)).toEqual([])
  expect(
    layoutFinalizers(
      { status: "Active", finalizers: [entry("a", "Pending")] },
      0,
    ),
  ).toEqual([])
})

test("pending queue left, the running one centres, finished stack right", () => {
  const panel: FinalizerPanel = {
    status: "Releasing",
    finalizers: [
      entry("a", "Succeeded"),
      entry("b", "Running"),
      entry("c", "Pending"),
      entry("d", "Pending"),
    ],
  }
  const layouts = layoutFinalizers(panel, 800)
  const byId = Object.fromEntries(
    layouts.map((layout) => [layout.entry.id, layout]),
  )
  expect(byId.b).toMatchObject({
    x: (800 - FINALIZER_CARD_WIDTH) / 2,
    zIndex: 20,
    isRunning: true,
  })
  expect(byId.c?.x).toBe(16)
  expect(byId.d?.x).toBe(51)
  expect(byId.a?.x).toBe(800 - 16 - FINALIZER_CARD_WIDTH)
})
