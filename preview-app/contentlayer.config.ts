import { defineDocumentType, makeSource } from 'contentlayer/source-files'
import highlight from 'rehype-highlight'

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
    nav_title: {
      type: 'string',
      description: 'Override the title for display in nav',
    },
    label: {
      type: 'string',
    },
    excerpt: {
      type: 'string',
    },
    show_child_cards: {
      type: 'boolean',
      default: false,
    },
    // seo: { type: 'nested', of: SEO },
  },
  computedFields: {
    // url_path: {
    //   type: 'string',
    //   description:
    //     'The URL path of this page relative to site root. For example, the site root page would be "/", and doc page would be "docs/getting-started/"',
    //   resolve: urlFromFilePath,
    // },
    pathSegments: {
      type: 'json',
      resolve: (doc) =>
        doc._raw.flattenedPath
          .split('/')
          // skip `/docs` prefix
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
  mdx: { rehypePlugins: [highlight] },
})
