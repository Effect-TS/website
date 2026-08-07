import * as Schema from "effect/Schema"

export const SoundPreference = Schema.Literals(["system", "on", "off"])
export type SoundPreference = typeof SoundPreference.Type

export interface SoundSettings {
  readonly preference: SoundPreference
  readonly unlocked: boolean
  readonly enabled: boolean
}

export type SoundCue =
  | {
      readonly _tag: "StepRunning"
      readonly exampleKey: string
      readonly stepId: string
    }
  | {
      readonly _tag: "StepSucceeded"
      readonly exampleKey: string
      readonly stepId: string
    }
  | {
      readonly _tag: "StepFailed"
      readonly exampleKey: string
      readonly stepId: string
    }
  | {
      readonly _tag: "StepInterrupted"
      readonly exampleKey: string
      readonly stepId: string
    }
  | {
      readonly _tag: "StepDied"
      readonly exampleKey: string
      readonly stepId: string
    }
  | {
      readonly _tag: "ExampleReset"
      readonly exampleKey: string
    }
  | {
      readonly _tag: "ControlChanged"
      readonly exampleKey: string
      readonly controlId: string
    }
  | {
      readonly _tag: "Notification"
      readonly exampleKey: string
      readonly stepId: string
    }
  | {
      readonly _tag: "FinalizerFinished"
      readonly exampleKey: string
      readonly finalizerId: string
    }

export const visualEffectExampleCueStepId = "__example__"

export const soundCueKey = (cue: SoundCue): string => {
  switch (cue._tag) {
    case "ExampleReset":
      return `${cue._tag}:${cue.exampleKey}`
    case "ControlChanged":
      return `${cue._tag}:${cue.exampleKey}:${cue.controlId}`
    case "FinalizerFinished":
      return `${cue._tag}:${cue.exampleKey}:${cue.finalizerId}`
    case "StepRunning":
    case "StepSucceeded":
    case "StepFailed":
    case "StepInterrupted":
    case "StepDied":
    case "Notification":
      return `${cue._tag}:${cue.exampleKey}:${cue.stepId}`
  }
}
