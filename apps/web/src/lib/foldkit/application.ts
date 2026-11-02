import type { Schema } from "effect"
import type { Update } from "foldkit"
import type { Document, HtmlBuilder } from "foldkit/html"
import type { Subscriptions } from "foldkit/subscription"
import buildId from "virtual:foldkit/build-id"

export type Slots = Readonly<Record<string, string>>

/** What the renderer hands to `flags`: the island props and the slot HTML. */
export interface FlagsInput<Props> {
  readonly props: Props
  readonly slots: Slots
}

export interface ApplicationSpec<
  Props,
  Model,
  Message extends { _tag: string },
  Flags,
> {
  readonly Model: Schema.Codec<Model, any, unknown, unknown>
  readonly Flags: Schema.Codec<Flags, any, never, never>
  readonly init: (flags: Flags) => Update.Return<Model, Message>
  readonly update: (
    model: Model,
    message: Message,
  ) => Update.Return<Model, Message>
  readonly view: (model: Model, h: HtmlBuilder<Message>) => Document
  readonly subscriptions?: Subscriptions<Model, Message>
  /**
   * Builds the first Flags from what Astro knows at render time. The server
   * embeds them in the HTML and the client reads them back, so they must not
   * depend on anything only the browser knows.
   */
  readonly flags: (input: FlagsInput<Props>) => Flags
}

export const ApplicationTypeId: unique symbol = Symbol.for(
  "effect-website/foldkit/Application",
)

/**
 * A page-owning Foldkit application Astro can render on the server and hydrate
 * in the browser with `client:load`. The value is callable so `.astro` files
 * type check props. Astro never calls it.
 *
 * The application owns the page: it writes the document title and hydrates a
 * single stamped root, so use at most one per page.
 */
export interface Application<Props> {
  (props: Props): never
  readonly [ApplicationTypeId]: ResolvedSpec<Props>
}

/** Fields the renderer adds to what the application defines. */
export type ResolvedSpec<Props> = ApplicationSpec<Props, any, any, any> & {
  readonly buildId: string
}

/**
 * The build id rides on the application, not on each page. Anything that
 * imports an application therefore depends on the id, so Astro's incremental
 * build re-renders those pages when it changes. A page that rendered under
 * another id would be refused by the client at hydration.
 */
export const defineApplication = <
  Props,
  Model,
  Message extends { _tag: string },
  Flags,
>(
  spec: ApplicationSpec<Props, Model, Message, Flags>,
): Application<Props> =>
  Object.assign(
    (): never => {
      throw new Error("A Foldkit application renders only through Astro.")
    },
    { [ApplicationTypeId]: { ...spec, buildId } },
  )

export const isApplication = (value: unknown): value is Application<unknown> =>
  typeof value === "function" && ApplicationTypeId in value
