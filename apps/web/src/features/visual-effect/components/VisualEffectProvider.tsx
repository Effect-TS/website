import { useAtomSet, useAtomValue } from "@effect/atom-react"
import * as Equal from "effect/Equal"
import * as React from "react"
import type {
  ExampleControl,
  ExampleDefinition,
  StepDefinition,
} from "@/features/visual-effect/model/example-definition"
import type { SoundPreference } from "@/features/visual-effect/model/sound"
import {
  exampleStateAtom,
  finalizersAtom,
  scheduleTimelineAtom,
  scheduleTimeAtom,
  stepStateAtom,
} from "@/features/visual-effect/runtime/state"
import {
  playControlChangedSoundAtom,
  resetExampleAtom,
  resetExampleSilentlyAtom,
  soundPreferenceAtom,
  soundSettingsAtom,
  startExampleAtom,
  stopAllSoundAtom,
  stopExampleAtom,
  unlockSoundAtom,
} from "@/features/visual-effect/state/atoms"

// =============================================================================
// Example Definition Context
// =============================================================================

export const ExampleContext = React.createContext<ExampleDefinition>(
  null as any,
)

export const useExampleDefinition = () => React.useContext(ExampleContext)

export const useExampleControls = () => {
  const example = useExampleDefinition()

  const start = useAtomSet(startExampleAtom)
  const stop = useAtomSet(stopExampleAtom)
  const reset = useAtomSet(resetExampleAtom)

  return {
    start() {
      start(example)
    },
    stop() {
      stop(example)
    },
    reset() {
      reset(example)
    },
  } as const
}

export const useExampleState = () => {
  const example = useExampleDefinition()
  return useAtomValue(exampleStateAtom(example))
}

// =============================================================================
// Step Definition Context
// =============================================================================

export const StepContext = React.createContext<StepDefinition>(null as any)

export const useStepDefinition = () => React.useContext(StepContext)

export const useStepState = () => {
  const step = useStepDefinition()
  return useAtomValue(stepStateAtom(step))
}

// =============================================================================
// Schedule Timeline
// =============================================================================

export const useScheduleTime = () => {
  const example = useExampleDefinition()
  return useAtomValue(scheduleTimeAtom(example))
}
export const useScheduleTimeline = () => {
  const example = useExampleDefinition()
  return useAtomValue(scheduleTimelineAtom(example))
}

export const useFinalizerPanel = () => {
  const example = useExampleDefinition()
  return useAtomValue(finalizersAtom(example))
}

// =============================================================================
// Example Controls
// =============================================================================

export const useControlWrite = <A,>(control: ExampleControl<A>) => {
  const example = useExampleDefinition()
  const current = useAtomValue(control.atom)
  const set = useAtomSet(control.atom)
  const resetExample = useAtomSet(resetExampleSilentlyAtom)
  const unlockSounds = useAtomSet(unlockSoundAtom)
  const playControlChangedSound = useAtomSet(playControlChangedSoundAtom)

  return React.useCallback(
    (next: A) => {
      if (Equal.equals(current, next)) {
        return
      }

      unlockSounds()

      set(next)

      playControlChangedSound({
        example,
        controlId: control.id,
      })

      resetExample(example)
    },
    [control, current, example, playControlChangedSound, set, unlockSounds],
  )
}

// =============================================================================
// Sound Settings / Controls
// =============================================================================

export const useSoundSettings = () => useAtomValue(soundSettingsAtom)

export const useSoundControls = () => {
  const unlockSounds = useAtomSet(unlockSoundAtom)
  const setSoundPreference = useAtomSet(soundPreferenceAtom)
  const stopAllSounds = useAtomSet(stopAllSoundAtom)

  return {
    unlockSounds() {
      unlockSounds(void 0)
    },
    stopAllSounds() {
      stopAllSounds(void 0)
    },
    setSoundPreference(preference: SoundPreference) {
      setSoundPreference(preference)
    },
  } as const
}
