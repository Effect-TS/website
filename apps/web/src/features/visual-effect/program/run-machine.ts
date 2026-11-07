import { Option, Schema } from "effect"
import { Machine } from "foldkit/experimental"
import { defineMessageUnion } from "foldkit/message"
import { Notification, Outcome, RunState, idle, notificationOf } from "./domain"

/** What happens to an effect or a step, as the run reports it. */
export const RunMessage = defineMessageUnion({
  Started: { at: Schema.Number },
  Ended: { at: Schema.Number, outcome: Outcome },
  Notified: { notification: Notification },
})
export type RunMessage = typeof RunMessage.Type

const ALL = [
  "Idle",
  "Running",
  "Succeeded",
  "Failed",
  "Interrupted",
  "Died",
] as const

/** An ended run counts its time from the start. Without a start it counts none. */
const startedAtOf = (state: RunState, at: number): number =>
  state._tag === "Running" ? state.startedAt : at

const endedOf = (state: RunState, at: number) => ({
  endedAt: at,
  durationMs: at - startedAtOf(state, at),
  maybeNotification: notificationOf(state),
})

/** The outcome of an Ended Message, when it is the one that the Edge names. */
const outcomeIs =
  <Tag extends Outcome["_tag"]>(tag: Tag) =>
  (
    _state: RunState,
    message: { readonly outcome: Outcome },
  ): Option.Option<Extract<Outcome, { _tag: Tag }>> =>
    message.outcome._tag === tag
      ? Option.some(message.outcome as Extract<Outcome, { _tag: Tag }>)
      : Option.none()

const withNotification = <State extends { _tag: string }>(
  state: State,
  notification: Notification,
) => ({ ...state, maybeNotification: Option.some(notification) })

/**
 * Every state can start, and every state can end. A notification stays on
 * the state that has it, except Idle, which has none.
 */
export const runMachine = Machine.define({
  state: RunState,
  message: RunMessage,
})({
  initial: idle,
  shared: [
    Machine.forStates(ALL).on({
      Started: Machine.to("Running", ({ message }) => ({
        model: {
          _tag: "Running" as const,
          startedAt: message.at,
          maybeNotification: Option.none(),
        },
      })),
      Ended: [
        Machine.when(
          outcomeIs("Succeeded"),
          "Succeeded",
          ({ state, message, guardValue }) => ({
            model: {
              _tag: "Succeeded" as const,
              value: guardValue.value,
              ...endedOf(state, message.at),
            },
          }),
        ),
        Machine.when(
          outcomeIs("Failed"),
          "Failed",
          ({ state, message, guardValue }) => ({
            model: {
              _tag: "Failed" as const,
              error: guardValue.error,
              ...endedOf(state, message.at),
            },
          }),
        ),
        Machine.when(
          outcomeIs("Interrupted"),
          "Interrupted",
          ({ state, message }) => ({
            model: {
              _tag: "Interrupted" as const,
              ...endedOf(state, message.at),
            },
          }),
        ),
        Machine.when(
          outcomeIs("Died"),
          "Died",
          ({ state, message, guardValue }) => ({
            model: {
              _tag: "Died" as const,
              defect: guardValue.defect,
              ...endedOf(state, message.at),
            },
          }),
        ),
      ],
    }),
  ],
  states: {
    Running: {
      on: {
        Notified: Machine.to("Running", ({ state, message }) => ({
          model: withNotification(state, message.notification),
        })),
      },
    },
    Succeeded: {
      on: {
        Notified: Machine.to("Succeeded", ({ state, message }) => ({
          model: withNotification(state, message.notification),
        })),
      },
    },
    Failed: {
      on: {
        Notified: Machine.to("Failed", ({ state, message }) => ({
          model: withNotification(state, message.notification),
        })),
      },
    },
    Interrupted: {
      on: {
        Notified: Machine.to("Interrupted", ({ state, message }) => ({
          model: withNotification(state, message.notification),
        })),
      },
    },
    Died: {
      on: {
        Notified: Machine.to("Died", ({ state, message }) => ({
          model: withNotification(state, message.notification),
        })),
      },
    },
  },
})

/** The next state, for code that wants no Commands. The Machine makes none. */
export const advance = (state: RunState, message: RunMessage): RunState =>
  runMachine.transition(state, message).model
