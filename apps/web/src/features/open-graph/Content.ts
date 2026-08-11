import { Context, type Effect } from "effect"
import type { OgCard, OgContentError, OgNotFound } from "./Model"

export interface OgContentService {
  readonly resolve: (
    slug: string,
  ) => Effect.Effect<OgCard, OgContentError | OgNotFound>
}

export class OgContent extends Context.Service<OgContent, OgContentService>()(
  "website/OgContent",
) {}
