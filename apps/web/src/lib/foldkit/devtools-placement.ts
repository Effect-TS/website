import { BrowserKeyValueStore } from "@effect/platform-browser"
import { Effect, Option, Schema, Stream, SubscriptionRef } from "effect"
import { KeyValueStore } from "effect/persistence"
import type { DevToolsPlacement } from "foldkit/devtools-host"
import {
  type ToolbarPlacement,
  toolbarPlacement,
} from "./devtools-toolbar-placement"

const STORAGE_KEY = "foldkit-devtools-placement"
const HANDLE_ATTRIBUTE = "data-dt-handle"
const INTERACTIVE = "button, input, select, textarea, a, [role='button']"
const MOBILE_MAX_WIDTH = 767

/** Panel size in `overlay-styles.ts`, wide variant. */
export const PANEL_WIDTH = 720
export const PANEL_HEIGHT = 480

/** Astro windows rest this far above the viewport bottom. */
const ABOVE_TOOLBAR = 72
const SIDE_GAP = 16

export type PanelStyle = Readonly<{
  top: string
  right: string
  bottom: string
  left: string
}>

/** Where the user left the Panel, as fractions of the free viewport space. */
const Saved = Schema.Struct({ x: Schema.Number, y: Schema.Number })
type Saved = typeof Saved.Type
const SavedJson = Schema.fromJsonString(Saved)

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

const fraction = (position: number, size: number, viewport: number): number =>
  viewport <= size ? 0 : clamp(position / (viewport - size), 0, 1)

export const startStyle = (toolbar: ToolbarPlacement): PanelStyle => {
  const base = {
    top: "auto",
    bottom: `${ABOVE_TOOLBAR}px`,
  }
  switch (toolbar) {
    case "bottom-left":
      return { ...base, left: `${SIDE_GAP}px`, right: "auto" }
    case "bottom-right":
      return { ...base, left: "auto", right: `${SIDE_GAP}px` }
    case "bottom-center":
      return {
        ...base,
        left: `max(0px, calc((100vw - ${PANEL_WIDTH}px) / 2))`,
        right: "auto",
      }
  }
}

export const savedStyle = (saved: Saved): PanelStyle => ({
  top: `max(0px, calc((100vh - ${PANEL_HEIGHT}px) * ${clamp(saved.y, 0, 1)}))`,
  left: `max(0px, calc((100vw - ${PANEL_WIDTH}px) * ${clamp(saved.x, 0, 1)}))`,
  right: "auto",
  bottom: "auto",
})

export const dragStyle = (left: number, top: number): PanelStyle => ({
  top: `${top}px`,
  left: `${left}px`,
  right: "auto",
  bottom: "auto",
})

export const toSaved = (
  left: number,
  top: number,
  viewport: Readonly<{ width: number; height: number }>,
): Saved => ({
  x: fraction(left, PANEL_WIDTH, viewport.width),
  y: fraction(top, PANEL_HEIGHT, viewport.height),
})

const storage = Effect.provide(BrowserKeyValueStore.layerLocalStorage)

const readSaved: Effect.Effect<Option.Option<Saved>> = Effect.gen(function* () {
  const store = yield* KeyValueStore.KeyValueStore
  const json = yield* Effect.fromOption(
    Option.fromNullishOr(yield* store.get(STORAGE_KEY)),
  )
  return Option.some(yield* Schema.decodeEffect(SavedJson)(json))
}).pipe(
  Effect.catch(() => Effect.succeed(Option.none<Saved>())),
  storage,
)

const writeSaved = (saved: Saved): Effect.Effect<void> =>
  Effect.gen(function* () {
    const store = yield* KeyValueStore.KeyValueStore
    yield* store.set(STORAGE_KEY, yield* Schema.encodeEffect(SavedJson)(saved))
  }).pipe(
    Effect.catch(() => Effect.void),
    storage,
  )

const isElement = (node: EventTarget): node is HTMLElement =>
  node instanceof HTMLElement

/**
 * Places the Panel like a native Astro toolbar window, above the toolbar and
 * on its side, until the user drags it. A dragged position is kept across page
 * loads and always stays inside the viewport.
 */
export const astroPlacement: DevToolsPlacement = ({ host, shadow }) =>
  Effect.gen(function* () {
    const toolbar = toolbarPlacement()
    let maybeSaved = yield* readSaved

    const apply = (style: PanelStyle): void => {
      host.style.setProperty("--dt-panel-top", style.top)
      host.style.setProperty("--dt-panel-right", style.right)
      host.style.setProperty("--dt-panel-bottom", style.bottom)
      host.style.setProperty("--dt-panel-left", style.left)
    }
    const render = (placement: ToolbarPlacement): Effect.Effect<void> =>
      Effect.sync(() =>
        apply(
          Option.match(maybeSaved, {
            onNone: () => startStyle(placement),
            onSome: savedStyle,
          }),
        ),
      )

    yield* Effect.addFinalizer(() =>
      Effect.sync(() =>
        ["top", "right", "bottom", "left"].forEach((side) =>
          host.style.removeProperty(`--dt-panel-${side}`),
        ),
      ),
    )
    yield* Stream.runForEach(SubscriptionRef.changes(toolbar), render).pipe(
      Effect.forkScoped,
    )

    yield* Effect.acquireRelease(
      Effect.sync(() => {
        let stopDrag: (() => void) | undefined
        const onPointerDown = (event: Event): void => {
          if (
            !(event instanceof PointerEvent) ||
            event.button !== 0 ||
            window.innerWidth <= MOBILE_MAX_WIDTH
          ) {
            return
          }
          const path = event.composedPath()
          const handle = path
            .filter(isElement)
            .find((node) => node.hasAttribute(HANDLE_ATTRIBUTE))
          const panel = handle?.parentElement
          if (
            handle === undefined ||
            panel === null ||
            panel === undefined ||
            path
              .slice(0, path.indexOf(handle))
              .some((node) => isElement(node) && node.matches(INTERACTIVE))
          ) {
            return
          }
          event.preventDefault()
          const rect = panel.getBoundingClientRect()
          let left = rect.left
          let top = rect.top
          const onMove = (move: PointerEvent): void => {
            left = clamp(
              rect.left + move.clientX - event.clientX,
              0,
              Math.max(0, window.innerWidth - rect.width),
            )
            top = clamp(
              rect.top + move.clientY - event.clientY,
              0,
              Math.max(0, window.innerHeight - rect.height),
            )
            apply(dragStyle(left, top))
          }
          const stop = (): void => {
            window.removeEventListener("pointermove", onMove)
            window.removeEventListener("pointerup", onUp)
            window.removeEventListener("pointercancel", onUp)
            stopDrag = undefined
          }
          const onUp = (): void => {
            stop()
            const saved = toSaved(left, top, {
              width: window.innerWidth,
              height: window.innerHeight,
            })
            maybeSaved = Option.some(saved)
            apply(savedStyle(saved))
            Effect.runFork(writeSaved(saved))
          }
          stopDrag = stop
          window.addEventListener("pointermove", onMove)
          window.addEventListener("pointerup", onUp)
          window.addEventListener("pointercancel", onUp)
        }
        shadow.addEventListener("pointerdown", onPointerDown)
        return { onPointerDown, stop: () => stopDrag?.() }
      }),
      ({ onPointerDown, stop }) =>
        Effect.sync(() => {
          shadow.removeEventListener("pointerdown", onPointerDown)
          stop()
        }),
    )
  })
