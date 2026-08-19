declare module "virtual:open-graph-metadata" {
  import type {
    ApiReferenceOgTemplateProps,
    OgTemplateProps,
  } from "@/services/OpenGraph"

  const metadata: {
    readonly apiReference: Readonly<
      Record<string, ApiReferenceOgTemplateProps | undefined>
    >
    readonly blog: Readonly<Record<string, OgTemplateProps | undefined>>
    readonly docs: Readonly<Record<string, OgTemplateProps | undefined>>
  }

  export default metadata
}
