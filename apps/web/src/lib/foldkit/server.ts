import { Effect } from "effect"
import { Server } from "foldkit/experimental"
import { ApplicationTypeId, isApplication, type Slots } from "./application"

/** The first application each page rendered, to refuse a second one. */
const firstOnPage = new WeakMap<object, string>()

/** Astro calls the renderer with the page being rendered as `this.result`. */
const pageOf = (context: unknown): object | undefined =>
  typeof context === "object" &&
  context !== null &&
  "result" in context &&
  typeof context.result === "object" &&
  context.result !== null
    ? context.result
    : undefined

/**
 * Foldkit hydrates one page-owning application per document: it writes the
 * document title and stamps a single root, and the client refuses a page with
 * two (`Runtime.hydrate` contains the page). Refusing here turns that browser
 * failure into a build error that names the page.
 */
const claimPage = (context: unknown, name: string): void => {
  const page = pageOf(context)
  if (page === undefined) return
  const first = firstOnPage.get(page)
  if (first !== undefined) {
    throw new Error(
      `A page can hold one Foldkit application, but ${name} follows ${first}. ` +
        "Each application owns the document title and hydrates a single root, so the browser would refuse the page.",
    )
  }
  firstOnPage.set(page, name)
}

/**
 * Astro server entrypoint. Renders the application with Foldkit's own server
 * renderer. The HTML carries the hydration handoff the client entry adopts.
 */
export default {
  name: "foldkit",
  check: async (Component: unknown) => isApplication(Component),
  renderToStaticMarkup: async function (
    this: unknown,
    Component: unknown,
    props: Record<string, unknown>,
    slots: Slots,
    metadata?: { readonly displayName?: string },
  ): Promise<{ html: string }> {
    if (!isApplication(Component)) {
      throw new Error(
        "The foldkit renderer needs a component from defineApplication.",
      )
    }
    claimPage(this, metadata?.displayName ?? "a Foldkit application")
    const spec = Component[ApplicationTypeId]
    // Astro types slots as strings but hands over HTMLString objects, which a
    // Schema.String field rejects. Normalise at the boundary.
    const plainSlots = Object.fromEntries(
      Object.entries(slots).map(([name, html]) => [name, String(html)]),
    )
    const rendered = await Effect.runPromise(
      Server.renderToString(
        { Flags: spec.Flags, init: spec.init, view: spec.view },
        {
          flags: spec.flags({ props, slots: plainSlots }),
          buildId: spec.buildId,
        },
      ),
    )
    return { html: rendered.html }
  },
}
