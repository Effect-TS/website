import { Array, Match } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"

/** Lucide paths, so the icons match the rest of the site. */
type Shape =
  | { readonly _tag: "Path"; readonly d: string }
  | {
      readonly _tag: "Circle"
      readonly cx: string
      readonly cy: string
      readonly r: string
    }
  | {
      readonly _tag: "Rect"
      readonly x: string
      readonly y: string
      readonly width: string
      readonly height: string
      readonly rx: string
    }

const path = (d: string): Shape => ({ _tag: "Path", d })

interface IconOptions {
  readonly className: string
  readonly isFilled?: boolean
  readonly strokeWidth?: string
  readonly size?: number
}

const shapeView = <M>(h: HtmlBuilder<M>, shape: Shape): Html =>
  Match.value(shape).pipe(
    Match.tagsExhaustive({
      Path: ({ d }) => h.path([h.D(d)]),
      Circle: ({ cx, cy, r }) => h.circle([h.Cx(cx), h.Cy(cy), h.R(r)]),
      Rect: ({ x, y, width, height, rx }) =>
        h.rect([h.X(x), h.Y(y), h.Width(width), h.Height(height), h.Rx(rx)]),
    }),
  )

const icon =
  (shapes: ReadonlyArray<Shape>) =>
  <M>(h: HtmlBuilder<M>, options: IconOptions): Html =>
    h.svg(
      [
        h.Class(options.className),
        h.ViewBox("0 0 24 24"),
        h.Fill(options.isFilled === true ? "currentColor" : "none"),
        h.Stroke("currentColor"),
        h.StrokeWidth(options.strokeWidth ?? "2"),
        h.StrokeLinecap("round"),
        h.StrokeLinejoin("round"),
        h.AriaHidden(true),
        ...(options.size === undefined
          ? []
          : [h.Width(String(options.size)), h.Height(String(options.size))]),
      ],
      Array.map(shapes, (shape) => shapeView(h, shape)),
    )

export const play = icon([
  path(
    "M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z",
  ),
])

export const square = icon([
  { _tag: "Rect", x: "3", y: "3", width: "18", height: "18", rx: "2" },
])

export const rotateCcw = icon([
  path("M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"),
  path("M3 3v5h5"),
])

export const arrowRight = icon([path("M5 12h14"), path("m12 5 7 7-7 7")])

export const skull = icon([
  path("m12.5 17-.5-1-.5 1h1z"),
  path(
    "M15 22a1 1 0 0 0 1-1v-1a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20v1a1 1 0 0 0 1 1z",
  ),
  { _tag: "Circle", cx: "15", cy: "12", r: "1" },
  { _tag: "Circle", cx: "9", cy: "12", r: "1" },
])

export const octagonAlert = icon([
  path("M12 16h.01"),
  path("M12 8v4"),
  path(
    "M15.312 2a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586l-4.688-4.688A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2z",
  ),
])

export const sparkle = icon([
  path(
    "M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z",
  ),
])

export const chevronRight = icon([path("m9 18 6-6-6-6")])

export const check = icon([path("M20 6 9 17l-5-5")])

export const octagonMinus = icon([
  path(
    "M2.586 16.726A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2h6.624a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586z",
  ),
  path("M8 12h8"),
])

export const triangleAlert = icon([
  path(
    "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",
  ),
  path("M12 9v4"),
  path("M12 17h.01"),
])
