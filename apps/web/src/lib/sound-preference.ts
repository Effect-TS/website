import * as Schema from "effect/Schema"

export const soundPreferenceKey =
  "effect-website:visual-effect:sound-preference"

export const SoundPreference = Schema.Literals(["system", "on", "off"])
export type SoundPreference = typeof SoundPreference.Type

export const isSoundEnabled = (
  preference: SoundPreference,
  prefersReducedMotion: boolean,
): boolean =>
  preference === "on" || (preference === "system" && !prefersReducedMotion)

const decodeSoundPreference = Schema.decodeUnknownSync(
  Schema.fromJsonString(SoundPreference),
)

export const readSoundPreference = (): SoundPreference => {
  try {
    const stored = window.localStorage.getItem(soundPreferenceKey)
    return stored === null ? "system" : decodeSoundPreference(stored)
  } catch {
    return "system"
  }
}
