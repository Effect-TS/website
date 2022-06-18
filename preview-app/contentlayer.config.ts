import { defineDocumentType, makeSource } from 'contentlayer/source-files'
import highlight from 'rehype-highlight'
import remarkShikiTwoslash from "remark-shiki-twoslash"
import rehypeRaw from 'rehype-raw'
import { nodeTypes } from '@mdx-js/mdx'

export const Doc = defineDocumentType(() => ({
  name: 'Doc',
  filePathPattern: `**/*.md`,
  contentType: 'mdx',
  fields: {
    title: {
      type: 'string',
      description: 'The title of the page',
      required: true,
    },
    show_child_cards: {
      type: 'boolean',
      default: false,
    },
    nav_title: {
      type: 'string',
      description: 'Override the title for display in nav',
      required: false
    },
    label: {
      type: 'string',
      required: false
    },
    excerpt: {
      type: 'string',
      required: false
    }
  },
  computedFields: {
    pathSegments: {
      type: 'json',
      resolve: (doc) =>
        doc._raw.flattenedPath
          .split('/')
          .slice(0)
          .map((dirName) => {
            const re = /^((\d+)-)?(.*)$/
            const [, , orderStr, pathName] = dirName.match(re) ?? []
            const order = orderStr ? parseInt(orderStr) : 0
            return { order, pathName }
          }),
    },
  },
  extensions: {},
}))

export default makeSource({
  contentDirPath: '../docs',
  documentTypes: [Doc],
  mdx: {
    rehypePlugins: [highlight, [rehypeRaw, { passThrough: nodeTypes }]],
    // @ts-expect-error
    remarkPlugins: [[remarkShikiTwoslash.default, { themes: ["github-dark", "github-light"] }]]
  },
})
