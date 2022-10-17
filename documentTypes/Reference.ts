import { defineDocumentType } from 'contentlayer/source-files'

export const Reference = defineDocumentType(() => ({
  name: 'Reference',
  filePathPattern: `reference/**/*.md`,
  contentType: 'markdown',
  fields: {},
  computedFields: {
    module: {
      type: 'string',
      resolve: (doc) => doc._raw.flattenedPath.replace(/^reference\//, ''),
    },
  },
  extensions: {},
}))
