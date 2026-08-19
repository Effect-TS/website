import * as Data from "effect/Data"
import type {
  ApiReferenceOgTemplateProps,
  OgTemplateProps,
} from "@/services/OpenGraph"

export type OgCard =
  | { readonly _tag: "Docs"; readonly props: OgTemplateProps }
  | { readonly _tag: "Blog"; readonly props: OgTemplateProps }
  | {
      readonly _tag: "ApiReference"
      readonly props: ApiReferenceOgTemplateProps
    }

export class OgNotFound extends Data.TaggedError("OgNotFound")<{
  readonly slug: string
}> {}
