import { Option } from "effect"
import { expect, test } from "vite-plus/test"
import { idle } from "../../../src/features/visual-effect/program/domain.ts"
import {
  RunMessage,
  advance,
  runMachine,
} from "../../../src/features/visual-effect/program/run-machine.ts"

const shown = { size: "Small", text: "ok" } as const
const notification = {
  id: 0,
  message: "hi",
  durationMs: 1000,
  showOnHover: false,
}

test("every state can be reached and every edge can fire", () => {
  expect(runMachine.unreachableStates()).toEqual([])
  expect(runMachine.deadTransitions()).toEqual([])
})

test("a run goes from idle to running to an end", () => {
  const running = advance(idle, RunMessage.Started({ at: 10 }))
  expect(running).toMatchObject({ _tag: "Running", startedAt: 10 })
  expect(
    advance(
      running,
      RunMessage.Ended({
        at: 40,
        outcome: { _tag: "Succeeded", value: shown },
      }),
    ),
  ).toMatchObject({ _tag: "Succeeded", durationMs: 30, endedAt: 40 })
})

test("each outcome names its state", () => {
  const running = advance(idle, RunMessage.Started({ at: 0 }))
  const end = (outcome: Parameters<typeof RunMessage.Ended>[0]["outcome"]) =>
    advance(running, RunMessage.Ended({ at: 1, outcome }))._tag
  expect(end({ _tag: "Failed", error: shown })).toBe("Failed")
  expect(end({ _tag: "Interrupted" })).toBe("Interrupted")
  expect(end({ _tag: "Died", defect: shown })).toBe("Died")
})

test("a step that ends without a start counts no time", () => {
  expect(
    advance(
      idle,
      RunMessage.Ended({ at: 9, outcome: { _tag: "Interrupted" } }),
    ),
  ).toMatchObject({ _tag: "Interrupted", durationMs: 0 })
})

test("a notification stays through the end, and idle has none", () => {
  expect(advance(idle, RunMessage.Notified({ notification }))).toEqual(idle)
  const running = advance(
    advance(idle, RunMessage.Started({ at: 0 })),
    RunMessage.Notified({ notification }),
  )
  const ended = advance(
    running,
    RunMessage.Ended({ at: 5, outcome: { _tag: "Interrupted" } }),
  )
  expect(ended).toMatchObject({ maybeNotification: Option.some(notification) })
})

test("a start from any state runs again, without the old notification", () => {
  const ended = advance(
    idle,
    RunMessage.Ended({ at: 5, outcome: { _tag: "Interrupted" } }),
  )
  expect(advance(ended, RunMessage.Started({ at: 6 }))).toEqual({
    _tag: "Running",
    startedAt: 6,
    maybeNotification: Option.none(),
  })
})
