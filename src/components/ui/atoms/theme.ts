import * as BrowserKeyValueStore from "@effect/platform-browser/BrowserKeyValueStore"
import * as Schema from "effect/Schema"
import * as Atom from "effect/unstable/reactivity/Atom"

const ThemeSchema = Schema.Literals(["light", "dark", "system"])

export type Theme = typeof ThemeSchema.Type

let transitionTimeout: number | undefined

function applyThemeClass(theme: Theme) {
  const root = document.documentElement
  root.classList.add("theme-transition")
  clearTimeout(transitionTimeout)
  transitionTimeout = window.setTimeout(() => root.classList.remove("theme-transition"), 300)

  const isDark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)
  root.classList.toggle("dark", isDark)
}

// ---------------------------------------------------------------------------
// KVS-backed theme preference
// ---------------------------------------------------------------------------

const kvsRuntime = Atom.runtime(BrowserKeyValueStore.layerLocalStorage)

export const themeAtom = Atom.kvs({
  runtime: kvsRuntime,
  key: "theme",
  schema: ThemeSchema,
  defaultValue: () => "dark" as Theme,
})

export const selectThemeAtom = Atom.fnSync<Theme>()((theme, get) => {
  get.set(themeAtom, theme)
  applyThemeClass(theme)
})

// ---------------------------------------------------------------------------
// Effective dark mode (derived)
// ---------------------------------------------------------------------------

export const isDarkAtom = Atom.make((get) => {
  const theme = get(themeAtom)

  const mq = window.matchMedia("(prefers-color-scheme: dark)")
  const handler = () => {
    if (get(themeAtom) === "system") {
      applyThemeClass("system")
      get.setSelf(mq.matches)
    }
  }
  mq.addEventListener("change", handler)
  get.addFinalizer(() => mq.removeEventListener("change", handler))

  if (theme === "dark") return true
  if (theme === "light") return false
  return mq.matches
})
