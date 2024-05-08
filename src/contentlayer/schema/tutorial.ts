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
      required: true
    },
    excerpt: {
      type: "string",
      description: "A brief description of the tutorial.",
      required: true
    },
    workspace: {
      type: "string",
      description: "The code workspace to load",
      required: true
    }
  },
  computedFields: {
    urlPath: {
      type: "string",
      description:
        'The URL path of this page relative to site root. For example, the site root page would be "/", and doc page would be "docs/getting-started/"',
      resolve: urlFromFilePath
    }
  }
}))
