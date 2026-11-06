import { Effect, Option, Schema, SubscriptionRef } from "effect"

export const TOOLBAR_PLACEMENTS = [
  "bottom-left",
  "bottom-center",
  "bottom-right",
] as const

export const ToolbarPlacement = Schema.Literals(TOOLBAR_PLACEMENTS)
export type ToolbarPlacement = typeof ToolbarPlacement.Type

const SETTINGS_KEY = "astro:dev-toolbar:settings"

const StoredSettings = Schema.fromJsonString(
  Schema.Struct({ placement: Schema.optional(ToolbarPlacement) }),
)

/**
 * Astro's own lookup order for the toolbar placement: a stored user setting,
 * then the integration config, then the default.
 */
export const resolveToolbarPlacement = (
  configured: unknown,
  storedJson: string | null,
): ToolbarPlacement =>
  Option.fromNullishOr(storedJson).pipe(
    Option.flatMap(Schema.decodeUnknownOption(StoredSettings)),
    Option.flatMap((settings) => Option.fromNullishOr(settings.placement)),
    Option.orElse(() =>
      Schema.decodeUnknownOption(ToolbarPlacement)(configured),
    ),
    Option.getOrElse((): ToolbarPlacement => "bottom-center"),
  )

const readToolbarPlacement = (): ToolbarPlacement =>
  resolveToolbarPlacement(
    (globalThis as { __astro_dev_toolbar__?: { placement?: unknown } })
      .__astro_dev_toolbar__?.placement,
    localStorage.getItem(SETTINGS_KEY),
  )

const KEY = Symbol.for("effect-website/foldkit/toolbar-placement")

/**
 * The toolbar app writes the placement Astro announces. The Placement reads
 * it. One ref serves the page.
 */
export const toolbarPlacement =
  (): SubscriptionRef.SubscriptionRef<ToolbarPlacement> => {
    const holder = globalThis as unknown as Record<
      symbol,
      SubscriptionRef.SubscriptionRef<ToolbarPlacement>
    >
    return (holder[KEY] ??= Effect.runSync(
      SubscriptionRef.make(readToolbarPlacement()),
    ))
  }
