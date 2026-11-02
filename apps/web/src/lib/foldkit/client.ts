import { Runtime } from "foldkit"
import { ApplicationTypeId, isApplication } from "./application"

/**
 * Astro client entrypoint. Adopts the server-rendered DOM in place. The
 * application owns the page, so there is no handle to dispose: Astro does not
 * swap pages on this site, so the island lives as long as the document.
 */
export default (_element: HTMLElement) =>
  async (Component: unknown): Promise<void> => {
    if (import.meta.env.DEV) {
      await import("./devtools-overlay")
    }
    if (!isApplication(Component)) {
      throw new Error(
        "The foldkit renderer needs a component from defineApplication.",
      )
    }
    const spec = Component[ApplicationTypeId]
    Runtime.hydrate(
      Runtime.makeApplication({
        Model: spec.Model,
        Flags: spec.Flags,
        init: spec.init,
        update: spec.update,
        view: spec.view,
        ...(spec.subscriptions === undefined
          ? {}
          : { subscriptions: spec.subscriptions }),
        container: null,
      }),
      { buildId: spec.buildId },
    )
  }
