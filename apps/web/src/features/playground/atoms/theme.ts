import * as Atom from "effect/unstable/reactivity/Atom"

function getTheme(): "light" | "dark" {
  const stored = localStorage?.getItem("theme")
  if (stored === "light" || stored === "dark") {
    return stored
  }
  return document.documentElement.classList.contains("dark") ? "dark" : "light"
}

export const themeAtom = Atom.make<"light" | "dark">((get) => {
  const observer = new MutationObserver(function () {
    get.setSelf(getTheme())
  })
  get.addFinalizer(() => {
    observer.disconnect()
  })
  observer.observe(document.documentElement, {
    attributeFilter: ["class"],
  })
  return getTheme()
})
