import {defineDocumentType} from '@contentlayer/source-files'
import {bundleMDX} from 'mdx-bundler'
import {getLastEditedDate} from '../utils/get-last-edited-date'
import {urlFromFilePath} from '../utils/url-from-file-path'
import {tocPlugin} from '../utils/toc-plugin'

export const DocsPage = defineDocumentType(() => ({
  name: 'DocsPage',
  filePathPattern: `docs/**/*.mdx`,
  contentType: 'mdx',
  fields: {
    title: {
      type: 'string',
      description: 'The title of the page.',
      required: true
    },
    navTitle: {
      type: 'string',
      description: 'Override the title for sidebar navigation.',
      required: false
    },
    excerpt: {
      type: 'string',
      description: 'A brief description of the content.',
      required: true
    },
    collapsible: {
      type: 'boolean',
      description: 'Collapse child pages in sidebar navigation.',
      required: false,
      default: false
    }
  },
  computedFields: {
    urlPath: {
      type: 'string',
      description:
        'The URL path of this page relative to site root. For example, the site root page would be "/", and doc page would be "docs/getting-started/"',
      resolve: urlFromFilePath
    },
    pathSegments: {
      type: 'json',
      resolve: (page) =>
        urlFromFilePath(page)
          .split('/')
          .slice(2)
          .map((dirName) => {
            const re = /^((\d+)-)?(.*)$/
            const [, , orderStr, pathName] = dirName.match(re) ?? []
            const order = orderStr ? parseInt(orderStr) : 0
            return {order, pathName}
          })
    },
    headings: {
      type: 'json',
      resolve: async (page) => {
        const headings: DocHeading[] = []
        await bundleMDX({
          source: page.body.raw,
          mdxOptions: (opts) => {
            opts.remarkPlugins = [...(opts.remarkPlugins ?? []), tocPlugin(headings)]
            return opts
          }
        })
        return [{level: 1, title: page.title}, ...headings]
      }
    },
    lastEdited: {type: 'date', resolve: getLastEditedDate}
  },
  extensions: {}
}))
