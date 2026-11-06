import { Effect } from "effect"
import { Server } from "foldkit/experimental"
import { ProgramTypeId, isProgram, type Slots } from "./program"

let programCount = 0
const countByPage = new WeakMap<object, number>()

/** Astro calls the renderer with the page being rendered as `this.result`. */
const pageOf = (context: unknown): object | undefined =>
  typeof context === "object" &&
  context !== null &&
  "result" in context &&
  typeof context.result === "object" &&
  context.result !== null
    ? context.result
    : undefined

/** Each Program on a page needs its own id: it pairs the root with its Flags and keys the preserved Model. */
const nextRuntimeId = (context: unknown): string => {
  const page = pageOf(context)
  if (page === undefined) {
    programCount += 1
    return `program-${programCount}`
  }
  const next = (countByPage.get(page) ?? 0) + 1
  countByPage.set(page, next)
  return `program-${next}`
}

/**
 * Astro server entrypoint. Renders each Program with Foldkit's own server
 * renderer. The HTML carries the hydration handoff the client entry adopts.
 */
export default {
  name: "foldkit",
  check: async (Component: unknown) => isProgram(Component),
  renderToStaticMarkup: async function (
    this: unknown,
    Component: unknown,
    props: Record<string, unknown>,
    slots: Slots,
  ): Promise<{ html: string }> {
    if (!isProgram(Component)) {
      throw new Error(
        "The foldkit renderer needs a component from defineProgram.",
      )
    }
    const spec = Component[ProgramTypeId]
    // Astro types slots as strings but hands over HTMLString objects, which a
    // Schema.String field rejects. Normalise at the boundary.
    const plainSlots = Object.fromEntries(
      Object.entries(slots).map(([name, html]) => [name, String(html)]),
    )
    const rendered = await Effect.runPromise(
      Server.renderElementToString(
        {
          Flags: spec.Flags,
          init: spec.init,
          view: spec.view,
        },
        {
          flags: spec.flags({ props, slots: plainSlots }),
          buildId: spec.buildId,
          runtimeId: nextRuntimeId(this),
        },
      ),
    )
    return { html: rendered.html }
  },
}
