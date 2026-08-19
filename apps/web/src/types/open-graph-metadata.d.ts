declare module "virtual:open-graph-metadata" {
  import type { OpenGraphContent } from "@/features/open-graph/model"

  type ApiProps = Extract<OpenGraphContent, { _tag: "Api" }>["props"]
  type BlogProps = Extract<OpenGraphContent, { _tag: "Docs" }>["props"]
  type DocsProps = Extract<OpenGraphContent, { _tag: "Docs" }>["props"]

  const metadata: {
    readonly apiReference: Readonly<Record<string, ApiProps | undefined>>
    readonly blog: Readonly<Record<string, BlogProps | undefined>>
    readonly docs: Readonly<Record<string, DocsProps | undefined>>
  }

  export default metadata
}
