import { makeSource } from 'contentlayer/source-files'
import highlight from 'rehype-highlight'
import remarkShikiTwoslash from 'remark-shiki-twoslash'
import rehypeRaw from 'rehype-raw'
import { nodeTypes } from '@mdx-js/mdx'
import * as DT from './documentTypes'

export default makeSource({
  contentDirPath: './content',
  documentTypes: Object.values(DT),
  mdx: {
    rehypePlugins: [highlight, [rehypeRaw, { passThrough: nodeTypes }]],
    remarkPlugins: [
      [
        // @ts-expect-error
        remarkShikiTwoslash.default,
        {
          themes: ['github-dark', 'github-light'],
          defaultCompilerOptions: {
            types: ["node"],
          },
        },
      ],
    ],
  },
})
