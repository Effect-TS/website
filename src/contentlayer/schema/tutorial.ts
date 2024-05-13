import { defineDocumentType } from "@contentlayer/source-files"
import { urlFromFilePath } from "../utils/url-from-file-path"

export const Tutorial = defineDocumentType(() => ({
  name: "Tutorial",
  filePathPattern: `tutorials/**/*.mdx`,
  contentType: "mdx",
  fields: {
    title: {
      type: "string",
      description: "The title of the page.",
      required: true
    },
    section: {
      type: "string",
      description: "The name of the section.",
      required: false
    },
    excerpt: {
      type: "string",
      description: "A brief description of the tutorial.",
      required: true
    },
    shellLayout: {
      type: "enum",
      options: ["watch", "server"],
      default: "watch"
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
    }
  }
}))
