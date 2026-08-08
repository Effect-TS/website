import * as Clock from "effect/Clock"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Scope from "effect/Scope"
import * as AtomRegistry from "effect/unstable/reactivity/AtomRegistry"
import {
  soundCueKey,
  type SoundCue,
} from "@/features/visual-effect/model/sound"
import {
  prefersReducedMotionAtom,
  soundPreferenceAtom,
} from "@/features/visual-effect/state/atoms"

const PENTATONIC_SCALE = ["C", "D", "E", "G", "A"] as const
const BASE_OCTAVE = 3
const CHORD_WINDOW_MS = 100
const DEDUPE_WINDOW_MS = 60

export interface ToneEngine {
  readonly play: (cue: SoundCue) => Effect.Effect<void>
  readonly stopAll: Effect.Effect<void>
}

export class SoundManager extends Context.Service<
  SoundManager,
  {
    readonly play: (cue: SoundCue) => Effect.Effect<void>
    readonly stopAll: Effect.Effect<void>
    readonly unlock: Effect.Effect<void>
  }
>()("SoundManager", {
  make: Effect.gen(function* () {
    const registry = yield* AtomRegistry.AtomRegistry
    const scope = yield* Effect.scope

    let isUnlocked = false
    const recentCueTimes = new Map<string, number>()
    const loadToneEngine = yield* Effect.cached(makeToneEngine)

    const pruneCueHistory = (nowMillis: number) => {
      const cutoff = nowMillis - DEDUPE_WINDOW_MS * 4
      for (const [key, timestamp] of recentCueTimes) {
        if (timestamp < cutoff) {
          recentCueTimes.delete(key)
        }
      }
    }

    const isSoundEnabled = () => {
      const soundPreference = registry.get(soundPreferenceAtom)
      const prefersReducedMotion = registry.get(prefersReducedMotionAtom)

      // Do not play sounds if the user has explicitly disabled them
      if (soundPreference === "off") {
        return false
      }

      if (soundPreference === "on") {
        return true
      }

      // If the user prefers reduced motion and they've set their sound
      // preference to system, respect their preferences
      return prefersReducedMotion === false
    }

    const isPlayableCue = Effect.fn(function* (cue: SoundCue) {
      const now = yield* Clock.currentTimeMillis
      const key = soundCueKey(cue)
      const previous = recentCueTimes.get(key)
      if (previous !== undefined && now - previous < DEDUPE_WINDOW_MS) {
        return false
      }
      recentCueTimes.set(key, now)
      pruneCueHistory(now)
      return true
    })

    const play = Effect.fn(function* (cue: SoundCue) {
      const soundEnabled = isSoundEnabled()
      if (!soundEnabled) {
        return yield* Effect.void
      }

      // Only attempt to load the tone engine if sound has been enabled
      const toneEngine = yield* Scope.provide(loadToneEngine, scope)

      if (isUnlocked && (yield* isPlayableCue(cue))) {
        return toneEngine.play(cue)
      }

      return yield* Effect.void
    })

    const unlock = Effect.sync(() => {
      isUnlocked = true
    })

    const stopAll = Effect.gen(function* () {
      if (!isUnlocked) {
        return yield* Effect.void
      }

      const toneEngine = yield* Scope.provide(loadToneEngine, scope)
      return yield* toneEngine.stopAll
    })

    return {
      play,
      stopAll,
      unlock,
    } as const
  }),
}) {
  static readonly layer = Layer.effect(this, this.make)
}

const makeToneEngine = Effect.gen(function* () {
  const Tone = yield* Effect.promise(() => import("tone"))
  yield* Effect.promise(() => Tone.start())

  const volume = new Tone.Volume(-12).toDestination()
  const reverb = new Tone.Reverb({ decay: 2.5, wet: 0.3 }).connect(volume)
  const distortion = new Tone.Distortion({ distortion: 0.8, wet: 1 }).connect(
    volume,
  )

  const running = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "sine" },
    envelope: { attack: 0.002, decay: 0.08, sustain: 0, release: 0.1 },
  }).connect(reverb)

  const success = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "triangle" },
    envelope: { attack: 0.02, decay: 0.3, sustain: 0.1, release: 1.2 },
  }).connect(reverb)

  const failure = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "sawtooth" },
    envelope: { attack: 0.02, decay: 0.4, sustain: 0.1, release: 0.8 },
  }).connect(reverb)

  const interrupted = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "triangle" },
    envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.04 },
  }).connect(reverb)

  const reset = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "sine" },
    envelope: { attack: 0.004, decay: 0.18, sustain: 0, release: 0.12 },
  }).connect(reverb)

  const death = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "fatsawtooth10" },
    envelope: { attack: 0.01, decay: 0.5, sustain: 0.3, release: 1.5 },
  }).connect(distortion)

  const config = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "triangle" },
    envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 },
  }).connect(reverb)

  const notification = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "sine" },
    envelope: { attack: 0.004, decay: 0.12, sustain: 0, release: 0.16 },
  }).connect(reverb)

  const finalizer = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "triangle" },
    envelope: { attack: 0.01, decay: 0.14, sustain: 0, release: 0.2 },
  }).connect(reverb)

  const transport = Tone.getTransport()

  if (transport.state !== "started") {
    transport.start()
  }

  let currentNoteIndex = 0
  let chordWindowStart: number | undefined = undefined
  let chordStep = 0
  let chordBaseIndex = 0
  let chordBaseOctave = BASE_OCTAVE
  let isPlayingFailure = false
  let isPlayingInterrupt = false

  const inChordWindow = (nowMs: number): boolean => {
    return (
      chordWindowStart !== undefined &&
      nowMs - chordWindowStart <= CHORD_WINDOW_MS
    )
  }

  const scheduleOnce = (callback: () => void, time: string | number): void => {
    transport.scheduleOnce(callback, time)
  }

  const getNextNote = (octaveOffset = 0): string => {
    const now = Date.now()
    if (!inChordWindow(now)) {
      chordWindowStart = now
      chordStep = 0
      chordBaseIndex = currentNoteIndex % PENTATONIC_SCALE.length
      chordBaseOctave = BASE_OCTAVE + octaveOffset
    }

    const scaleIndex = (chordBaseIndex + chordStep) % PENTATONIC_SCALE.length
    const note = PENTATONIC_SCALE[scaleIndex]
    const octave = chordBaseOctave

    chordStep += 1
    currentNoteIndex = (currentNoteIndex + 1) % (PENTATONIC_SCALE.length * 2)

    return `${note}${octave}`
  }

  const play = (cue: SoundCue) => {
    const now = Tone.now()
    switch (cue._tag) {
      case "StepRunning": {
        running.triggerAttackRelease(getNextNote(0.5), "32n", now, 0.25)
        break
      }
      case "StepSucceeded": {
        const currentTime = Date.now()
        if (!inChordWindow(currentTime)) {
          chordWindowStart = currentTime
          chordStep = 0
          chordBaseIndex = currentNoteIndex % PENTATONIC_SCALE.length
          chordBaseOctave = BASE_OCTAVE + 1
        }

        const rootNoteName = PENTATONIC_SCALE[chordBaseIndex]
        const rootNote = `${rootNoteName}${chordBaseOctave}`
        const semitoneOffset = [0, 4, 7][chordStep % 3] ?? 0
        const note = Tone.Frequency(rootNote).transpose(semitoneOffset).toNote()

        chordStep += 1
        currentNoteIndex =
          (currentNoteIndex + 1) % (PENTATONIC_SCALE.length * 2)

        success.triggerAttackRelease(note, "4n")
        break
      }
      case "StepFailed": {
        if (isPlayingFailure) {
          break
        }

        isPlayingFailure = true
        const note = `${PENTATONIC_SCALE[currentNoteIndex % PENTATONIC_SCALE.length]}${BASE_OCTAVE - 1}`
        currentNoteIndex = (currentNoteIndex + 1) % PENTATONIC_SCALE.length

        failure.triggerAttackRelease(note, "4n", now, 0.65)
        scheduleOnce(() => {
          isPlayingFailure = false
        }, "+0.2")
        break
      }
      case "StepInterrupted": {
        if (isPlayingInterrupt) {
          break
        }

        isPlayingInterrupt = true
        interrupted.triggerAttackRelease("C5", "32n", now, 0.6)
        interrupted.triggerAttackRelease("E5", "32n", now + 0.07, 0.6)
        scheduleOnce(() => {
          isPlayingInterrupt = false
        }, "+0.2")
        break
      }
      case "StepDied": {
        death.triggerAttackRelease(`D#${BASE_OCTAVE}`, "32n", now, 0.45)
        death.triggerAttackRelease(`C${BASE_OCTAVE - 2}`, "1n", now + 0.1, 0.55)
        break
      }
      case "ExampleReset": {
        reset.triggerAttackRelease(`G${BASE_OCTAVE}`, "16n", now, 0.6)
        reset.triggerAttackRelease(`C${BASE_OCTAVE}`, "16n", now + 0.1, 0.6)
        break
      }
      case "ControlChanged": {
        config.triggerAttackRelease("G5", "16n", now, 0.6)
        break
      }
      case "Notification": {
        notification.triggerAttackRelease("D5", "32n", now, 0.35)
        notification.triggerAttackRelease("G5", "16n", now + 0.08, 0.3)
        break
      }
      case "FinalizerFinished": {
        finalizer.triggerAttackRelease("E5", "32n", now, 0.22)
        finalizer.triggerAttackRelease("A5", "16n", now + 0.06, 0.18)
        break
      }
    }
  }

  const stopAll = Effect.sync(() => {
    transport.cancel()
    running.releaseAll()
    success.releaseAll()
    failure.releaseAll()
    interrupted.releaseAll()
    reset.releaseAll()
    death.releaseAll()
    config.releaseAll()
    notification.releaseAll()
    finalizer.releaseAll()
    isPlayingFailure = false
    isPlayingInterrupt = false
    chordWindowStart = undefined
  })

  yield* Effect.addFinalizer(() => stopAll)

  return {
    play,
    stopAll,
  } as const
})
