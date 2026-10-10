import * as Effect from "effect/Effect"
import {
  MARKDOWN_DOCS_VERSIONS,
  docSlugForDocId,
  docsPageToMarkdown,
} from "@/features/docs/markdown"
import { LlmsContent, type Doc } from "./content"
import type { LlmsPage, LlmsScope } from "./domain"

const toPage = (doc: Doc): LlmsPage => {
  let markdown: string | undefined
  return {
    title: doc.title,
    description: doc.description,
    path: `/docs/${docSlugForDocId(doc.id)}`,
    markdown: () =>
      (markdown ??= docsPageToMarkdown({ title: doc.title, body: doc.body })),
  }
}

export const scopes = Effect.gen(function* () {
  const content = yield* LlmsContent

  return yield* Effect.forEach(MARKDOWN_DOCS_VERSIONS, (version) =>
    Effect.gen(function* () {
      const sections = yield* Effect.cached(
        content.docGroups(version).pipe(
          Effect.map((groups) =>
            groups.map((group) => ({
              title: group.label,
              pages: group.docs.map(toPage),
            })),
          ),
        ),
      )
      return {
        kind: "docs",
        params: { version },
        path: `/docs/${version}`,
        title: `Effect ${version} documentation`,
        summary: `Guides and tutorials for Effect ${version}.`,
        inRootFull: true,
        sections,
      } satisfies LlmsScope
    }),
  )
})
