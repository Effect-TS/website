// The arrows this post's visuals draw between two columns of rows: from a
// step to where its result lands, and back again when the result is read
// back. Shared by RecipeVisual and ReplayVisual.

import {
  rel,
  type Point,
} from "@/components/blog/module-of-the-week/stepper/stepper"

// How long an arrow takes to draw: longer the farther it goes, so a long
// one doesn't whip across, within these bounds. Then how long it lingers.
const MIN_DRAW_MS = 350
const MAX_DRAW_MS = 800
const MS_PER_PX = 1.6
const LINGER_MS = 700
// How round the corners are on an arrow that goes around the outside
const CORNER = 8
const SVG = "http://www.w3.org/2000/svg"

const reduceMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches

// A path through the points, with the corners rounded off
function rounded(pts: ReadonlyArray<Point>) {
  let d = `M${pts[0]!.x} ${pts[0]!.y}`
  for (let i = 1; i < pts.length - 1; i++) {
    const [a, p, b] = [pts[i - 1]!, pts[i]!, pts[i + 1]!]
    const into = Math.hypot(p.x - a.x, p.y - a.y)
    const out = Math.hypot(b.x - p.x, b.y - p.y)
    const r = Math.min(CORNER, into / 2, out / 2)
    const before = {
      x: p.x - ((p.x - a.x) / into) * r,
      y: p.y - ((p.y - a.y) / into) * r,
    }
    const after = {
      x: p.x + ((b.x - p.x) / out) * r,
      y: p.y + ((b.y - p.y) / out) * r,
    }
    d += ` L${before.x} ${before.y} Q${p.x} ${p.y} ${after.x} ${after.y}`
  }
  const last = pts.at(-1)!
  return `${d} L${last.x} ${last.y}`
}

// Draws an arrow from a row on the left to a row on the right: straight
// across when the columns sit side by side, and around the outside when the
// right one is under the left, through `gutter` if it's given and just past
// the stage's edge if not. `back` points it from right to left. The arrow
// goes in `layer`, an SVG over the whole stage, with the `is-back` class
// when it's a result being read back, which is whenever it points back
// unless `readBack` says otherwise. Resolves once it's drawn, then fades it
// out.
export function drawArrow(options: {
  stage: HTMLElement
  layer: SVGSVGElement
  from: Element
  to: Element
  back: boolean
  // Whether the right column sits under the left one
  stacked: boolean
  className: string
  readBack?: boolean
  gutter?: number
}) {
  const { stage, layer, back, stacked, className } = options
  const readBack = options.readBack ?? back
  const r = rel(stage, options.from)
  const t = rel(stage, options.to)
  const middle = (x: { top: number; bottom: number }) => (x.top + x.bottom) / 2
  const gutter = options.gutter ?? stage.clientWidth + 8
  let pts: Array<Point> = stacked
    ? [
        { x: r.right + 2, y: middle(r) },
        { x: gutter, y: middle(r) },
        { x: gutter, y: middle(t) },
        { x: t.right + 2, y: middle(t) },
      ]
    : [
        { x: r.right + 4, y: middle(r) },
        { x: t.left - 4, y: middle(t) },
      ]
  if (back) pts = pts.reverse()
  const end = pts.at(-1)!
  const before = pts.at(-2)!
  const angle = (Math.atan2(end.y - before.y, end.x - before.x) * 180) / Math.PI

  const group = document.createElementNS(SVG, "g")
  group.setAttribute("class", readBack ? `${className} is-back` : className)
  const line = document.createElementNS(SVG, "path")
  line.setAttribute("d", rounded(pts))
  const head = document.createElementNS(SVG, "path")
  head.setAttribute("d", "M-6 -4 L0 0 L-6 4")
  head.setAttribute(
    "transform",
    `translate(${end.x} ${end.y}) rotate(${angle})`,
  )
  group.append(line, head)
  layer.append(group)
  // Measured once it's in the page, curves and all
  const length = line.getTotalLength()
  line.setAttribute("stroke-dasharray", String(length))

  const fade = () =>
    setTimeout(() => {
      group.classList.add("is-gone")
      setTimeout(() => group.remove(), 300)
    }, LINGER_MS)
  if (reduceMotion()) {
    fade()
    return Promise.resolve()
  }
  head.style.opacity = "0"
  const draw = line.animate(
    [{ strokeDashoffset: length }, { strokeDashoffset: 0 }],
    {
      duration: Math.min(
        MAX_DRAW_MS,
        Math.max(MIN_DRAW_MS, length * MS_PER_PX),
      ),
      easing: "cubic-bezier(0.65, 0, 0.35, 1)",
    },
  )
  return draw.finished.then(
    () => {
      head.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 120,
        fill: "forwards",
      })
      head.style.opacity = "1"
      fade()
    },
    () => {},
  )
}
