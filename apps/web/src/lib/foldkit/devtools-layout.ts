import { DEVTOOLS_HOST_ID } from "foldkit/devtools-host"

const LAYOUT_STYLE_ID = "foldkit-devtools-layout"
const GAP = 12

/**
 * Keeps the panel where Foldkit puts it until it would sit on the Astro
 * toolbar. It then moves up to rest just above it.
 */
const astroBar = (): DOMRect | null =>
  document
    .querySelector("astro-dev-toolbar")
    ?.shadowRoot?.getElementById("dev-bar")
    ?.getBoundingClientRect() ?? null

const overlapsHorizontally = (a: DOMRect, b: DOMRect): boolean =>
  a.left < b.right && a.right > b.left

export const attachLayout = (shadow: ShadowRoot): (() => void) => {
  if (shadow.getElementById(LAYOUT_STYLE_ID) === null) {
    const style = document.createElement("style")
    style.id = LAYOUT_STYLE_ID
    style.textContent = `.dt-panel-br, .dt-panel-bl { bottom: var(--fk-lift, 16px); }`
    shadow.appendChild(style)
  }

  const layout = () => {
    const host = document.getElementById(DEVTOOLS_HOST_ID)
    const panel = shadow.querySelector<HTMLElement>(".dt-panel")
    const bar = astroBar()
    if (host === null || panel === null || bar === null) {
      return
    }
    const lift = overlapsHorizontally(panel.getBoundingClientRect(), bar)
      ? window.innerHeight - bar.top + GAP
      : 16
    host.style.setProperty("--fk-lift", `${lift}px`)
  }

  const mutations = new MutationObserver(layout)
  mutations.observe(shadow, { childList: true, subtree: true })
  window.addEventListener("resize", layout)
  layout()

  return () => {
    mutations.disconnect()
    window.removeEventListener("resize", layout)
  }
}
