import { Context, type Effect } from "effect"
import type { OgFontError, OgRenderError, OgCard } from "./Model"

export type DynamicOgCard = Exclude<OgCard, { readonly _tag: "Static" }>

export interface OgRendererService {
  readonly render: (
    card: DynamicOgCard,
    requestUrl: URL,
  ) => Effect.Effect<Uint8Array, OgFontError | OgRenderError>
}

export class OgRenderer extends Context.Service<
  OgRenderer,
  OgRendererService
>()("website/OgRenderer") {}
