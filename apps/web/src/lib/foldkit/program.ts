import { Predicate, type Schema } from "effect"
import type { Update } from "foldkit"
import type { Html, HtmlBuilder } from "foldkit/html"
import type { Subscriptions } from "foldkit/subscription"
import buildId from "virtual:foldkit/build-id"

export type Slots = Readonly<Record<string, string>>

/** What the renderer hands to `flags`: the island props and the slot HTML. */
export interface FlagsInput<Props> {
  readonly props: Props
  readonly slots: Slots
}

export interface ProgramSpec<
  Props,
  Model,
  Message extends { _tag: string },
  Flags,
> {
  /** Names the Program in the DevTools dropdown, from its props. Defaults to the island's module name. */
  readonly name?: string | ((props: Props) => string)
  readonly Model: Schema.Codec<Model, any, unknown, unknown>
  readonly Flags: Schema.Codec<Flags, any, never, never>
  readonly init: (flags: Flags) => Update.Return<Model, Message>
  readonly update: (
    model: Model,
    message: Message,
  ) => Update.Return<Model, Message>
  readonly view: (model: Model, h: HtmlBuilder<Message>) => Html
  readonly subscriptions?: Subscriptions<Model, Message>
  /**
   * Builds the first Flags from what Astro knows at render time. The server
   * embeds them in the HTML and the client reads them back, so they must not
   * depend on anything only the browser knows.
   */
  readonly flags: (input: FlagsInput<Props>) => Flags
}

export const ProgramTypeId: unique symbol = Symbol.for(
  "effect-website/foldkit/Program",
)

/** Fields the renderer adds to what the Program defines. */
export type ResolvedSpec<Props> = ProgramSpec<Props, any, any, any> & {
  readonly buildId: string
}

/**
 * A Foldkit Program Astro renders on the server and hydrates in the browser
 * with any `client:*` directive. The value is callable so `.astro` files type
 * check props. Astro never calls it. A page can hold any number of Programs.
 *
 * The build id rides on the Program, not on each page. Anything that imports a
 * Program therefore depends on the id, so Astro's incremental build re-renders
 * those pages when it changes. A page that rendered under another id would be
 * refused by the client at hydration.
 */
export interface Program<Props> {
  (props: Props): never
  readonly [ProgramTypeId]: ResolvedSpec<Props>
}

export const defineProgram = <
  Props,
  Model,
  Message extends { _tag: string },
  Flags,
>(
  spec: ProgramSpec<Props, Model, Message, Flags>,
): Program<Props> =>
  Object.assign(
    (): never => {
      throw new Error("A Foldkit Program renders only through Astro.")
    },
    { [ProgramTypeId]: { ...spec, buildId } },
  )

export const isProgram = (value: unknown): value is Program<unknown> =>
  Predicate.isFunction(value) && ProgramTypeId in value
