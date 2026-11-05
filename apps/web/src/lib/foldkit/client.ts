import { Effect } from "effect"
import { Runtime } from "foldkit"
import {
  ApplicationTypeId,
  ELEMENT_ATTRIBUTE,
  ElementTypeId,
  isApplication,
  isElement,
} from "./application"

let embeddedCount = 0

const nameOf = (
  name: string | ((props: never) => string) | undefined,
  props: Record<string, unknown>,
): string | undefined =>
  typeof name === "function" ? name(props as never) : name

/**
 * Astro client entrypoint. An application adopts the server-rendered DOM in
 * place and lives as long as the document. An element starts in the empty
 * container the server left, through `Runtime.embed`.
 */
export default (element: HTMLElement) =>
  async (Component: unknown, props: Record<string, unknown>): Promise<void> => {
    if (import.meta.env.DEV) {
      await import("./devtools-overlay")
    }
    if (isElement(Component)) {
      const spec = Component[ElementTypeId]
      const container = element.querySelector<HTMLElement>(
        `[${ELEMENT_ATTRIBUTE}]`,
      )
      if (container === null) {
        throw new Error("The foldkit element has no container to start in.")
      }
      embeddedCount += 1
      container.id = `foldkit-element-${embeddedCount}`
      Runtime.embed(
        Runtime.makeElement({
          Model: spec.Model,
          Flags: spec.Flags,
          flags: Effect.succeed(spec.flags(props)),
          init: spec.init,
          update: spec.update,
          view: spec.view,
          ...(spec.subscriptions === undefined
            ? {}
            : { subscriptions: spec.subscriptions }),
          container,
          devTools: {
            banner:
              nameOf(spec.name, props) ??
              element.getAttribute("component-url") ??
              "Foldkit element",
          },
        }),
      )
      return
    }
    if (!isApplication(Component)) {
      throw new Error(
        "The foldkit renderer needs a component from defineApplication or defineElement.",
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
