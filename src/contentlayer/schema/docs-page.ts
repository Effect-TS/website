import { defineDocumentType } from "@contentlayer/source-files"
import { bundleMDX } from "mdx-bundler"
import { getLastEditedDate } from "../utils/get-last-edited-date"
import { urlFromFilePath } from "../utils/url-from-file-path"
import { tocPlugin } from "../utils/toc-plugin"
import { sectionsPlugin } from "../utils/sections-plugin"

export const DocsPage = defineDocumentType(() => ({
  name: "DocsPage",
  filePathPattern: `docs/**/*.mdx`,
  contentType: "mdx",
  fields: {
    title: {
      type: "string",
      description: "The title of the page.",
      required: true
    },
    navTitle: {
      type: "string",
      description: "Override the title for sidebar navigation.",
      required: false
    },
    excerpt: {
      type: "string",
      description: "A brief description of the content.",
      required: true
    },
    collapsible: {
      type: "boolean",
      description: "Collapse child pages in sidebar navigation.",
      required: false,
      default: false
    },
    bottomNavigation: {
      type: "enum",
      description:
        "If and what bottom navigation should be shown on the page.",
      options: ["none", "childCards", "pagination"],
      required: true,
      default: "none"
    }
  },
  computedFields: {
    urlPath: {
      type: "string",
      description:
        'The URL path of this page relative to site root. For example, the site root page would be "/", and doc page would be "docs/getting-started/"',
      resolve: urlFromFilePath
    },
    pathSegments: {
      type: "json",
      resolve: (page) =>
        urlFromFilePath(page, true)
          .split("/")
          .slice(2)
          .map((dirName) => {
            const re = /^((\d+)-)?(.*)$/
            const [, , orderStr, pathName] = dirName.match(re) ?? []
            const order = orderStr ? parseInt(orderStr) : 0
            return { order, pathName }
          })
    },
    order: {
      type: "number",
      resolve: (page) => {
        const re = /^((\d+)-)?(.*)$/
        const parentSlug =
          page._raw.sourceFilePath.split("/")[
            page._raw.sourceFilePath.split("/").length - 2
          ]
        const [, , orderStr] =
          page._raw.sourceFileName.match(re) ?? parentSlug.match(re) ?? []
        return orderStr ? parseInt(orderStr) : 0
      }
    },
    headings: {
      type: "json",
      resolve: async (page) => {
        const headings: DocHeading[] = []
        await bundleMDX({
          source: page.body.raw,
          mdxOptions: (opts) => {
            opts.remarkPlugins = [
              ...(opts.remarkPlugins ?? []),
              tocPlugin(headings)
            ]
            return opts
          }
        })
        return [{ level: 1, title: page.title }, ...headings]
      }
    },
    sections: {
      type: "json",
      resolve: async (page) => {
        const sections: DocsSection[] = []
        await bundleMDX({
          source: page.body.raw,
          mdxOptions: (opts) => {
            opts.remarkPlugins = [
              ...(opts.remarkPlugins ?? []),
              sectionsPlugin(sections)
            ]
            return opts
          }
        })
        return sections
      }
    },
    lastEdited: { type: "date", resolve: getLastEditedDate }
  },
  extensions: {}
}))
