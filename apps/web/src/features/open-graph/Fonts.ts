import { Context, type Effect } from "effect"
import type { OgFont } from "@/services/OpenGraph"
import type { OgFontError } from "./Model"

export interface OgFontsService {
  readonly load: (
    requestUrl: URL,
  ) => Effect.Effect<ReadonlyArray<OgFont>, OgFontError>
}

export class OgFonts extends Context.Service<OgFonts, OgFontsService>()(
  "website/OgFonts",
) {}
