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
    // @ts-expect-error
    remarkPlugins: [[remarkShikiTwoslash.default, { themes: ['github-dark', 'github-light'] }]],
  },
})
