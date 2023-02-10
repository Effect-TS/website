import { defineDocumentType, defineNestedType, makeSource } from 'contentlayer/source-files'
import highlight from 'rehype-highlight'
import remarkShikiTwoslash from 'remark-shiki-twoslash'
import rehypeRaw from 'rehype-raw'
import { nodeTypes } from '@mdx-js/mdx'
import * as DT from './documentTypes'

const leadingSlashRegex = /^\//
const pathSegmentRegex = /^(?:(\d+)-)?(.*)$/

const Doc = defineDocumentType(() => ({
  name: 'Doc',
  filePathPattern: 'docs/**/*.md',
  contentType: 'mdx',
  fields: {
    title: {
      type: 'string',
      description: 'The title of the page',
      required: true,
    },
  },
  computedFields: {
    navigationMetadata: {
      type: 'json',
      description: `
The navigation metadata for a document. The \`order\` allows for sorting of the
navigation items in the sidebar and the \`path\` is the path segment of the URL.
For example, \`/docs/200-creating-effects\` will be \`[{order: 200, path:
'creating-effects'}]\`.
      `,
      resolve: (doc) =>
        doc._raw.flattenedPath
          .split('/')
          .slice(1)
          .map((dirName) => {
            // The input will be something like:
            //   "200-creating-effects"
            const result = dirName.match(pathSegmentRegex)
            if (result === null) {
              return []
            }
            // To extract the order and path, a regular expression is used
            // which returns something like:
            //   ["200-creating-effects", "200", "creating-effects"]
            const order = result[1] !== undefined ? parseInt(result[1]) : 0
            const path = result[2] !== undefined ? result[2].replace(leadingSlashRegex, '') : ''
            return { order, path }
          }),
    },
  },
}))

export default makeSource({
  contentDirPath: './content',
  documentTypes: [Doc],
  mdx: {
    rehypePlugins: [highlight, [rehypeRaw, { passThrough: nodeTypes }]],
    remarkPlugins: [
      [
        // @ts-expect-error
        remarkShikiTwoslash.default,
        {
          themes: ['github-dark', 'github-light'],
          defaultCompilerOptions: {
            types: ['node'],
          },
        },
      ],
    ],
  },
})
