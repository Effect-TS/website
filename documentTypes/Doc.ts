import { defineDocumentType } from 'contentlayer/source-files'

export const Doc = defineDocumentType(() => ({
  name: 'Doc',
  filePathPattern: `docs/**/*.md`,
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
      required: false,
    },
    label: {
      type: 'string',
      required: false,
    },
    excerpt: {
      type: 'string',
      required: false,
    },
  },
  computedFields: {
    pathSegments: {
      type: 'json',
      resolve: (doc) =>
        doc._raw.flattenedPath
          .split('/')
          .slice(1)
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
