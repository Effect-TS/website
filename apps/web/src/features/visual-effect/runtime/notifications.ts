import * as Cause from "effect/Cause"
import * as DateTime from "effect/DateTime"
import * as Duration from "effect/Duration"
import * as Exit from "effect/Exit"
import * as Option from "effect/Option"
import * as Result from "effect/Result"
import {
  RenderableResult,
  VisualEffectState,
  type VisualEffectNotification,
} from "@/features/visual-effect/model/domain"

const getNotificationDuration = (
  attributes: Record<string, unknown> | undefined,
): Duration.Duration => {
  const duration = attributes?.duration
  return Duration.isDuration(duration) ? duration : Duration.seconds(2)
}

const getNotificationShowOnHover = (
  attributes: Record<string, unknown> | undefined,
): boolean => {
  return attributes?.showOnHover === true
}

const makeNotification = (
  message: string,
  attributes: Record<string, unknown> | undefined,
): VisualEffectNotification => ({
  id: crypto.randomUUID(),
  message,
  duration: getNotificationDuration(attributes),
  showOnHover: getNotificationShowOnHover(attributes),
})

export const setStateNotification = (
  state: VisualEffectState,
  message: string,
  attributes: Record<string, unknown> | undefined,
): VisualEffectState => {
  const notification = Option.some(makeNotification(message, attributes))

  switch (state._tag) {
    case "Running":
      return VisualEffectState.Running({
        startedAt: state.startedAt,
        notification,
      })
    case "Succeeded":
      return VisualEffectState.Succeeded({
        duration: state.duration,
        endedAt: state.endedAt,
        value: state.value,
        notification,
      })
    case "Failed":
      return VisualEffectState.Failed({
        duration: state.duration,
        endedAt: state.endedAt,
        error: state.error,
        notification,
      })
    case "Interrupted":
      return VisualEffectState.Interrupted({
        duration: state.duration,
        endedAt: state.endedAt,
        notification,
      })
    case "Died":
      return VisualEffectState.Died({
        defect: state.defect,
        duration: state.duration,
        endedAt: state.endedAt,
        notification,
      })
    case "Idle":
      return state
  }
}

const getStateNotification = (
  state: VisualEffectState,
): Option.Option<VisualEffectNotification> => {
  switch (state._tag) {
    case "Running":
    case "Succeeded":
    case "Failed":
    case "Interrupted":
    case "Died":
      return state.notification
    case "Idle":
      return Option.none()
  }
}

export const exitToState = (
  exit: Exit.Exit<unknown, unknown>,
  startedAt: DateTime.Utc,
  endedAt: DateTime.Utc,
  previous: VisualEffectState,
): VisualEffectState => {
  const duration = DateTime.distance(startedAt, endedAt)
  const notification = getStateNotification(previous)

  if (Exit.isSuccess(exit)) {
    return VisualEffectState.Succeeded({
      duration,
      endedAt,
      value: exit.value as RenderableResult,
      notification,
    })
  }

  if (Cause.hasInterruptsOnly(exit.cause)) {
    return VisualEffectState.Interrupted({
      duration,
      endedAt,
      notification,
    })
  }

  const defect = Cause.findDefect(exit.cause)

  if (Result.isSuccess(defect)) {
    return VisualEffectState.Died({
      defect: defect.success as RenderableResult,
      duration,
      endedAt,
      notification,
    })
  }

  const error = Cause.squash(exit.cause) as RenderableResult

  return VisualEffectState.Failed({
    duration,
    endedAt,
    error,
    notification,
  })
}
