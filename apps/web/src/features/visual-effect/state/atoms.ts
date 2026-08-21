import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Atom from "effect/unstable/reactivity/Atom"
import type { ExampleDefinition } from "@/features/visual-effect/model/example-definition"
import type { SoundSettings } from "@/features/visual-effect/model/sound"
import { SoundManager } from "@/features/visual-effect/runtime/SoundManager"
import { VisualEffectManager } from "@/features/visual-effect/runtime/VisualEffectManager"
import {
  prefersReducedMotionAtom,
  soundPreferenceAtom,
} from "@/features/visual-effect/state/sound-atoms"

export {
  prefersReducedMotionAtom,
  soundPreferenceAtom,
} from "@/features/visual-effect/state/sound-atoms"

// =============================================================================
// Visual Effect Atom Runtime
// =============================================================================

const VisualEffectsLayer = VisualEffectManager.layer.pipe(
  Layer.provideMerge(SoundManager.layer),
)

export const visualEffectsRuntime = Atom.runtime(VisualEffectsLayer)

// =============================================================================
// Visual Effect Controls
// =============================================================================

export const startExampleAtom = visualEffectsRuntime.fn<ExampleDefinition>()(
  (example) => VisualEffectManager.use((_) => _.start(example)),
  { concurrent: true },
)

export const stopExampleAtom = visualEffectsRuntime.fn<ExampleDefinition>()(
  (example) => VisualEffectManager.use((_) => _.stop(example)),
  { concurrent: true },
)

export const resetExampleAtom = visualEffectsRuntime.fn<ExampleDefinition>()(
  (example) => VisualEffectManager.use((_) => _.reset(example)),
  { concurrent: true },
)

export const resetExampleSilentlyAtom =
  visualEffectsRuntime.fn<ExampleDefinition>()(
    (example) =>
      VisualEffectManager.use((_) => _.reset(example, { silent: true })),
    { concurrent: true },
  )

export interface PlayControlChangedSoundInput {
  readonly example: ExampleDefinition
  readonly controlId: string
}

export const playControlChangedSoundAtom =
  visualEffectsRuntime.fn<PlayControlChangedSoundInput>()(
    ({ example, controlId }) =>
      SoundManager.use((soundManager) =>
        soundManager.play({
          _tag: "ControlChanged",
          exampleKey: example.key,
          controlId,
        }),
      ),
    { concurrent: true },
  )

export const stopAllSoundAtom = visualEffectsRuntime.fn<void>()(
  () => SoundManager.use((_) => _.stopAll),
  { concurrent: true },
)

// =============================================================================
// Sound Controls
// =============================================================================

export const unlockSoundAtom = visualEffectsRuntime.fn<void>()(
  Effect.fnUntraced(function* (_: void, get: Atom.FnContext) {
    yield* SoundManager.use((_) => _.unlock)
    get.set(soundUnlockedAtom, true)
  }),
  { concurrent: true },
)

export const soundUnlockedAtom = Atom.make(false).pipe(
  Atom.withLabel("visual-effects:sound-unlocked"),
)

export const soundSettingsAtom = Atom.make<SoundSettings>((get) => ({
  preference: get(soundPreferenceAtom),
  unlocked: get(soundUnlockedAtom),
  enabled: get(soundEnabledAtom),
})).pipe(Atom.withLabel("visual-effects:sound-settings"))

export const soundEnabledAtom = Atom.make((get) => {
  const preference = get(soundPreferenceAtom)
  const unlocked = get(soundUnlockedAtom)
  const prefersReducedMotion = get(prefersReducedMotionAtom)
  if (!unlocked) {
    return false
  }
  if (preference === "off") {
    return false
  }
  if (preference === "on") {
    return true
  }
  return !prefersReducedMotion
}).pipe(Atom.withLabel("visual-effects:sound-enabled"), Atom.keepAlive)
