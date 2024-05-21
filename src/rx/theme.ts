import { Rx } from "@effect-rx/rx-react"

function getTheme(): "light" | "dark" {
  const selected = localStorage?.theme || "system"
  if (selected === "light" || selected === "dark") return selected
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light"
}

export const themeRx = Rx.make<"light" | "dark">((get) => {
  const observer = new MutationObserver(function () {
    get.setSelfSync(getTheme())
  })
  get.addFinalizer(() => {
    observer.disconnect()
  })
  observer.observe(document.documentElement, { attributeFilter: ["class"] })
  return getTheme()
})
