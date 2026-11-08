import { Effect } from "effect"
import { Runtime } from "foldkit"
import { ProgramTypeId, isProgram } from "./program"

const ROOT_SELECTOR = "[data-foldkit-app]"

const nameOf = (
  name: string | ((props: never) => string) | undefined,
  props: Record<string, unknown>,
): string | undefined =>
  typeof name === "function" ? name(props as never) : name

/**
 * Astro client entrypoint. Each Program adopts the server-rendered root inside
 * its own island, in place, so late islands start without rebuilding any DOM.
 */
export default (element: HTMLElement) =>
  async (Component: unknown, props: Record<string, unknown>): Promise<void> => {
    if (import.meta.env.DEV) {
      await import("./devtools-overlay")
    }
    if (!isProgram(Component)) {
      throw new Error(
        "The foldkit renderer needs a component from defineProgram.",
      )
    }
    const spec = Component[ProgramTypeId]
    const container = element.querySelector<HTMLElement>(ROOT_SELECTOR)
    if (container === null) {
      throw new Error("The Foldkit island has no server-rendered root.")
    }
    Runtime.hydrate(
      Runtime.makeElement({
        Model: spec.Model,
        Flags: spec.Flags,
        flags: Effect.die(
          new Error("A hydrated Program reads its Flags from the page."),
        ),
        init: spec.init,
        update: spec.update,
        view: spec.view,
        ...(spec.subscriptions === undefined
          ? {}
          : { subscriptions: spec.subscriptions }),
        ...(spec.resources === undefined ? {} : { resources: spec.resources }),
        container,
        devTools: {
          banner:
            nameOf(spec.name, props) ??
            element.getAttribute("component-url") ??
            "Foldkit program",
        },
      }),
      { buildId: spec.buildId },
    )
  }
