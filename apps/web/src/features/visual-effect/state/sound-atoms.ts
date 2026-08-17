import * as BrowserKeyValueStore from "@effect/platform-browser/BrowserKeyValueStore"
import * as Atom from "effect/unstable/reactivity/Atom"
import { SoundPreference } from "@/features/visual-effect/model/sound"

const kvsRuntime = Atom.runtime(BrowserKeyValueStore.layerLocalStorage)

export const soundPreferenceAtom = Atom.kvs({
  runtime: kvsRuntime,
  key: "effect-website:visual-effect:sound-preference",
  schema: SoundPreference,
  defaultValue: () => "system" as const,
}).pipe(Atom.withLabel("visual-effects:sound-preference"))

export const prefersReducedMotionAtom = Atom.make((get) => {
  if (typeof window === "undefined") {
    return false
  }

  const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")

  const syncReducedMotion = () => {
    get.setSelf(mediaQuery.matches)
  }

  window.addEventListener("change", syncReducedMotion)
  get.addFinalizer(() =>
    window.removeEventListener("change", syncReducedMotion),
  )

  return mediaQuery.matches
})
