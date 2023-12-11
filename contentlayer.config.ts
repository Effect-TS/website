// TODO remove eslint-disable when fixed https://github.com/import-js/eslint-plugin-import/issues/1810
// eslint-disable-next-line import/no-unresolved
import { BlogPost } from './src/contentlayer/schema/blog-post'
import { DocsPage } from './src/contentlayer/schema/docs-page'
import { makeSource } from 'contentlayer/source-files'
import remarkGfm from 'remark-gfm'
// import rehypeShikiji from 'rehype-shikiji'
import type { Options as RehypePrettyCodeOptions } from 'rehype-pretty-code'
import rehypePrettyCode from 'rehype-pretty-code'
import codeImport from "remark-code-import"

export const CODE_BLOCK_FILENAME_REGEX = /filename="([^"]+)"/

const DEFAULT_REHYPE_PRETTY_CODE_OPTIONS: RehypePrettyCodeOptions = {
  onVisitLine(node: any) {
    // Prevent lines from collapsing in `display: grid` mode, and
    // allow empty lines to be copy/pasted
    if (node.children.length === 0) {
      node.children = [{ type: 'text', value: ' ' }]
    }
  },
  onVisitHighlightedLine(node: any) {
    if (!node.properties.className) node.properties.className = []
    node.properties.className.push('highlighted')
  },
  onVisitHighlightedChars(node: any) {
    node.properties.className = ['highlighted']
  },
  filterMetaString: (meta: string) =>
    meta.replace(CODE_BLOCK_FILENAME_REGEX, '')
}


export default makeSource({
  contentDirPath: 'content',
  contentDirExclude: ['src'],
  documentTypes: [DocsPage, BlogPost],
  mdx: {
    remarkPlugins: [[codeImport, { rootDir: process.cwd() + '/content' }], remarkGfm],
    rehypePlugins: [
      [
        rehypePrettyCode,
        {
          ...DEFAULT_REHYPE_PRETTY_CODE_OPTIONS,
          theme: 'github-dark',
        }
      ] as any
      //   [rehypeShikiji as any, {
      //   // or `theme` for a single theme
      //   theme: 'github-dark',
      //   // themes: {
      //   //   light: 'github-light',
      //   //   dark: 'github-dark',
      //   // }
      // }]
    ]
  }
})
