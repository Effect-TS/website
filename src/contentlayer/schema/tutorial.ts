import { defineDocumentType } from "@contentlayer/source-files"

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
  }
}))