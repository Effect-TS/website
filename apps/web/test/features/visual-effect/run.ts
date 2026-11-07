import {
  idle,
  type Notification,
  type Outcome,
  type RunState,
} from "../../../src/features/visual-effect/program/domain.ts"
import {
  RunMessage,
  advance,
} from "../../../src/features/visual-effect/program/run-machine.ts"

export const start = (at: number): RunState =>
  advance(idle, RunMessage.Started({ at }))

export const settle = (
  state: RunState,
  outcome: Outcome,
  at: number,
): RunState => advance(state, RunMessage.Ended({ at, outcome }))

export const withNotification = (
  state: RunState,
  notification: Notification,
): RunState => advance(state, RunMessage.Notified({ notification }))
