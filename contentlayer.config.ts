// TODO remove eslint-disable when fixed https://github.com/import-js/eslint-plugin-import/issues/1810
// eslint-disable-next-line import/no-unresolved
import { BlogPost } from './src/contentlayer/schema/blog-post'
import { DocsPage } from './src/contentlayer/schema/docs-page'
import { makeSource } from 'contentlayer/source-files'
import remarkGfm from 'remark-gfm'
import rehypeShikiji from 'rehype-shikiji'
import codeImport from "remark-code-import"



export default makeSource({
  contentDirPath: 'content',
  contentDirExclude: ['src'],
  documentTypes: [DocsPage, BlogPost],
  mdx: {
    remarkPlugins: [[codeImport, {rootDir: process.cwd() + '/content' }], remarkGfm],
    rehypePlugins: [[rehypeShikiji as any, {
      // or `theme` for a single theme
      theme: 'github-dark',
      // themes: {
      //   light: 'github-light',
      //   dark: 'github-dark',
      // }
    }]]
  }
})
