import { Array } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"
import type { FinalizerEntry } from "../domain"
import {
  FINALIZER_CARD_WIDTH,
  layoutFinalizers,
  type FinalizerLayout,
} from "../finalizers"
import { cardScale } from "../motion-commands"
import { AnimateFinalizerCard, MeasureWidth, PulseChevrons } from "../mount"
import type { Message } from "../message"
import type { Model } from "../model"
import {
  check,
  chevronRight,
  octagonMinus,
  square,
  triangleAlert,
} from "./icons"

type Builder = HtmlBuilder<Message>

const cardClass = (phase: FinalizerEntry["phase"]): string => {
  switch (phase) {
    case "Pending":
      return "border-neutral-700 bg-neutral-800"
    case "Running":
      return "border-blue-500 bg-blue-950"
    case "Succeeded":
      return "border-emerald-500 bg-emerald-950"
    case "Interrupted":
      return "border-amber-500 bg-amber-950"
    case "Failed":
      return "border-red-500 bg-red-950"
  }
}

const iconClass = (phase: FinalizerEntry["phase"]): string => {
  switch (phase) {
    case "Pending":
      return "border-neutral-500 bg-neutral-700 text-neutral-200"
    case "Running":
      return "border-blue-500 bg-blue-900 text-blue-200"
    case "Succeeded":
      return "border-emerald-500 bg-emerald-500 text-white"
    case "Interrupted":
      return "border-amber-500 bg-amber-700 text-white"
    case "Failed":
      return "border-red-500 bg-red-700 text-white"
  }
}

const labelClass = (phase: FinalizerEntry["phase"]): string => {
  switch (phase) {
    case "Pending":
      return "text-white"
    case "Running":
      return "text-blue-200"
    case "Succeeded":
      return "text-emerald-200"
    case "Interrupted":
      return "text-amber-100"
    case "Failed":
      return "text-red-200"
  }
}

const phaseIcon = (phase: FinalizerEntry["phase"], h: Builder): Html => {
  switch (phase) {
    case "Pending":
      return square(h, { className: "size-3.5" })
    case "Running":
      return square(h, { className: "relative z-10 size-3.5", isFilled: true })
    case "Succeeded":
      return check(h, { className: "size-3.5", strokeWidth: "3" })
    case "Interrupted":
      return octagonMinus(h, { className: "size-3.5" })
    case "Failed":
      return triangleAlert(h, { className: "size-3.5" })
  }
}

const cardView = (
  { entry, x, zIndex, isRunning }: FinalizerLayout,
  h: Builder,
): Html =>
  h.keyed("div")(
    entry.id,
    [
      h.OnMount(
        AnimateFinalizerCard({
          id: entry.id,
          x,
          scale: cardScale(isRunning),
          phase: entry.phase,
        }),
      ),
      h.Class("absolute top-[18px]"),
      h.Style({ zIndex: String(zIndex) }),
    ],
    [
      h.div(
        [
          h.DataAttribute("layout", "card"),
          h.Class(
            `relative flex h-[52px] items-center gap-3 rounded-lg border px-4 py-3 shadow-lg shadow-black/40 ${cardClass(entry.phase)}`,
          ),
          h.Style({ minWidth: `${FINALIZER_CARD_WIDTH}px` }),
        ],
        [
          h.div(
            [
              h.Class(
                `relative flex size-6 items-center justify-center rounded border ${iconClass(entry.phase)}`,
              ),
            ],
            [
              ...(entry.phase === "Running"
                ? [
                    h.div(
                      [
                        h.DataAttribute("layout", "icon-pulse"),
                        h.Class("absolute inset-0 rounded"),
                        h.Style({
                          background:
                            "radial-gradient(circle, rgba(59, 130, 246, 0.35) 0%, transparent 70%)",
                          opacity: "0.35",
                        }),
                      ],
                      [],
                    ),
                  ]
                : []),
              phaseIcon(entry.phase, h),
            ],
          ),
          ...(entry.phase === "Running"
            ? [
                h.div(
                  [
                    h.DataAttribute("layout", "card-pulse"),
                    h.Class("pointer-events-none absolute inset-0 rounded-lg"),
                    h.Style({
                      opacity: "0",
                      background:
                        "radial-gradient(ellipse at center, rgba(59, 130, 246, 0.18) 0%, transparent 70%)",
                    }),
                  ],
                  [],
                ),
              ]
            : []),
          h.div(
            [
              h.DataAttribute("layout", "flash"),
              h.Class("pointer-events-none absolute inset-0 rounded-lg"),
              h.Style({ opacity: "0" }),
            ],
            [],
          ),
          h.div(
            [h.Class("relative z-10 min-w-0")],
            [
              h.span(
                [
                  h.Class(
                    `block truncate font-mono text-base font-medium ${labelClass(entry.phase)}`,
                  ),
                ],
                [entry.label],
              ),
            ],
          ),
        ],
      ),
    ],
  )

const chevronRow = (h: Builder): Html =>
  h.div(
    [h.Class("flex gap-1 text-neutral-600")],
    Array.map([0, 1, 2], (index) =>
      h.keyed("span")(
        `chevron-${index}`,
        [
          h.DataAttribute("layout", "chevron"),
          h.DataAttribute("index", String(index)),
          h.Style({ opacity: "0.2" }),
        ],
        [chevronRight(h, { className: "size-4", strokeWidth: "2.5" })],
      ),
    ),
  )

export const finalizersView = (model: Model, h: Builder): Html =>
  h.section(
    [
      h.DataAttribute("testid", "visual-effect-finalizers"),
      h.Class("border-b border-zinc-800 bg-zinc-950/80 px-4 py-4"),
    ],
    [
      h.div(
        [
          h.Class(
            "relative h-[88px] overflow-hidden rounded-xl border border-dashed border-neutral-700/80",
          ),
          h.OnMount(MeasureWidth()),
        ],
        [
          h.div(
            [
              h.OnMount(PulseChevrons()),
              h.Class(
                "absolute inset-0 flex items-center justify-center text-neutral-700",
              ),
            ],
            [
              h.div(
                [
                  h.Class(
                    "flex items-center gap-2 font-mono text-sm tracking-[0.28em]",
                  ),
                ],
                [chevronRow(h), h.span([], ["FINALIZERS"]), chevronRow(h)],
              ),
            ],
          ),
          ...Array.map(
            layoutFinalizers(model.finalizers, model.containerWidth),
            (layout) => cardView(layout, h),
          ),
        ],
      ),
    ],
  )
