import { assert, test } from "vite-plus/test"
import {
  PANEL_HEIGHT,
  PANEL_WIDTH,
  dragStyle,
  savedStyle,
  startStyle,
  toSaved,
} from "../../src/lib/foldkit/devtools-placement.ts"
import { resolveToolbarPlacement } from "../../src/lib/foldkit/devtools-toolbar-placement.ts"

test("the start sits above the Astro toolbar on the toolbar's side", () => {
  assert.deepEqual(startStyle("bottom-left"), {
    top: "auto",
    bottom: "72px",
    left: "16px",
    right: "auto",
  })
  assert.deepEqual(startStyle("bottom-right"), {
    top: "auto",
    bottom: "72px",
    left: "auto",
    right: "16px",
  })
  assert.strictEqual(
    startStyle("bottom-center").left,
    `max(0px, calc((100vw - ${PANEL_WIDTH}px) / 2))`,
  )
})

test("a saved position out of range stays inside the viewport", () => {
  assert.include(savedStyle({ x: 9, y: -3 }).left, "* 1))")
  assert.include(savedStyle({ x: 9, y: -3 }).top, "* 0))")
})

test("a drop converts to a fraction of the free space", () => {
  const viewport = { width: PANEL_WIDTH + 1000, height: PANEL_HEIGHT + 400 }
  assert.deepEqual(toSaved(500, 200, viewport), { x: 0.5, y: 0.5 })
  assert.deepEqual(toSaved(-50, 9000, viewport), { x: 0, y: 1 })
})

test("a viewport smaller than the Panel saves the origin", () => {
  assert.deepEqual(toSaved(10, 10, { width: 300, height: 300 }), { x: 0, y: 0 })
})

test("a drag shows the pointer position", () => {
  assert.deepEqual(dragStyle(10, 20), {
    top: "20px",
    left: "10px",
    right: "auto",
    bottom: "auto",
  })
})

test("the toolbar placement follows Astro's order", () => {
  assert.strictEqual(resolveToolbarPlacement(undefined, null), "bottom-center")
  assert.strictEqual(
    resolveToolbarPlacement("bottom-left", null),
    "bottom-left",
  )
  assert.strictEqual(
    resolveToolbarPlacement("bottom-left", '{"placement":"bottom-right"}'),
    "bottom-right",
  )
  assert.strictEqual(
    resolveToolbarPlacement("bottom-left", '{"verbose":true}'),
    "bottom-left",
  )
  assert.strictEqual(
    resolveToolbarPlacement("nope", "not json"),
    "bottom-center",
  )
})
