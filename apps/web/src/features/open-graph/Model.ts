import * as Data from "effect/Data"
import type {
  ApiReferenceOgTemplateProps,
  OgTemplateProps,
} from "@/services/OpenGraph"

export type OgCard =
  | { readonly _tag: "Static"; readonly bytes: Uint8Array }
  | { readonly _tag: "Docs"; readonly props: OgTemplateProps }
  | { readonly _tag: "Blog"; readonly props: OgTemplateProps }
  | {
      readonly _tag: "ApiReference"
      readonly props: ApiReferenceOgTemplateProps
    }

export class OgNotFound extends Data.TaggedError("OgNotFound")<{
  readonly slug: string
}> {}

export class OgContentError extends Data.TaggedError("OgContentError")<{
  readonly slug: string
  readonly cause: unknown
}> {}

export class OgFontError extends Data.TaggedError("OgFontError")<{
  readonly font: string
  readonly cause: unknown
}> {}

export class OgRenderError extends Data.TaggedError("OgRenderError")<{
  readonly template: OgCard["_tag"]
  readonly cause: unknown
}> {}

export class OgRequestError extends Data.TaggedError("OgRequestError")<{
  readonly url: string
  readonly cause: unknown
}> {}
