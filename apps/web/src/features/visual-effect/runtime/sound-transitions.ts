import * as Effect from "effect/Effect"
import type { VisualEffectState } from "@/features/visual-effect/model/domain"
import type { ExampleDefinition } from "@/features/visual-effect/model/example-definition"
import { ExampleStep } from "@/features/visual-effect/model/example-definition"
import { visualEffectExampleCueStepId } from "@/features/visual-effect/model/sound"
import type { SoundManager } from "./SoundManager"

export const playExampleTransition = (
  soundManager: SoundManager["Service"],
  resettingExamples: ReadonlySet<string>,
  example: ExampleDefinition,
  previous: VisualEffectState,
  current: VisualEffectState,
): Effect.Effect<void> => {
  if (previous._tag === current._tag || resettingExamples.has(example.key)) {
    return Effect.void
  }

  if (previous._tag === "Idle" && current._tag === "Running") {
    return soundManager.play({
      _tag: "StepRunning",
      exampleKey: example.key,
      stepId: visualEffectExampleCueStepId,
    })
  }

  if (example.steps.length > 0 || previous._tag !== "Running") {
    return Effect.void
  }

  switch (current._tag) {
    case "Succeeded":
      return soundManager.play({
        _tag: "StepSucceeded",
        exampleKey: example.key,
        stepId: visualEffectExampleCueStepId,
      })
    case "Failed":
      return soundManager.play({
        _tag: "StepFailed",
        exampleKey: example.key,
        stepId: visualEffectExampleCueStepId,
      })
    case "Interrupted":
      return soundManager.play({
        _tag: "StepInterrupted",
        exampleKey: example.key,
        stepId: visualEffectExampleCueStepId,
      })
    case "Died":
      return soundManager.play({
        _tag: "StepDied",
        exampleKey: example.key,
        stepId: visualEffectExampleCueStepId,
      })
    default:
      return Effect.void
  }
}

export const playStepTransition = (
  soundManager: SoundManager["Service"],
  resettingExamples: ReadonlySet<string>,
  details: ExampleStep["Service"],
  previous: VisualEffectState,
  current: VisualEffectState,
): Effect.Effect<void> => {
  if (
    previous._tag === current._tag ||
    resettingExamples.has(details.definition.key)
  ) {
    return Effect.void
  }

  if (current._tag === "Running") {
    return soundManager.play({
      _tag: "StepRunning",
      exampleKey: details.definition.key,
      stepId: details.step.id,
    })
  }

  if (previous._tag !== "Running") {
    return Effect.void
  }

  switch (current._tag) {
    case "Succeeded":
      return soundManager.play({
        _tag: "StepSucceeded",
        exampleKey: details.definition.key,
        stepId: details.step.id,
      })
    case "Failed":
      return soundManager.play({
        _tag: "StepFailed",
        exampleKey: details.definition.key,
        stepId: details.step.id,
      })
    case "Interrupted":
      return soundManager.play({
        _tag: "StepInterrupted",
        exampleKey: details.definition.key,
        stepId: details.step.id,
      })
    case "Died":
      return soundManager.play({
        _tag: "StepDied",
        exampleKey: details.definition.key,
        stepId: details.step.id,
      })
    default:
      return Effect.void
  }
}
