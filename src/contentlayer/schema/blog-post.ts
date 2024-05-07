import { defineDocumentType } from "@contentlayer/source-files"
import { bundleMDX } from "mdx-bundler"
import { urlFromFilePath } from "../utils/url-from-file-path"
import { tocPlugin } from "../utils/toc-plugin"
import { Author } from "./author"
import { sectionsPlugin } from "../utils/sections-plugin"

export const BlogPost = defineDocumentType(() => ({
  name: "BlogPost",
  filePathPattern: `blog/**/*.mdx`,
  contentType: "mdx",
  fields: {
    title: {
      type: "string",
      description: "The title of the post.",
      required: true
    },
    excerpt: {
      type: "string",
      description: "A brief description of the content.",
      required: true
    },
    date: {
      type: "date",
      description: "Publishing date.",
      required: true
    },
    authors: {
      type: "list",
      description: "One or more authors of the post.",
      of: Author,
      required: true
    },
    relatedPosts: {
      type: "list",
      description: "List of slugs for related posts.",
      of: { type: "string" },
      required: false
    }
  },
  computedFields: {
    urlPath: {
      type: "string",
      description: "The URL path of this post relative to site root.",
      resolve: urlFromFilePath
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
              tocPlugin(headings) as any
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
              sectionsPlugin(sections) as any
            ]
            return opts
          }
        })
        return sections
      }
    }
  },
  extensions: {}
}))
