// TODO remove eslint-disable when fixed https://github.com/import-js/eslint-plugin-import/issues/1810
// eslint-disable-next-line import/no-unresolved
import {BlogPost} from './src/contentlayer/schema/blog-post'
import {DocsPage} from './src/contentlayer/schema/docs-page'
import {makeSource} from 'contentlayer/source-files'

export default makeSource({
  contentDirPath: 'content',
  documentTypes: [DocsPage, BlogPost]
})
