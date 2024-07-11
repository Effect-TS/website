import {defineNestedType} from 'contentlayer2/source-files'

export const Author = defineNestedType(() => ({
  name: 'Author',
  fields: {
    name: {
      type: 'string',
      description: 'Name of the author.',
      required: true
    },
    description: {
      type: 'string',
      description: 'Role or other description of the author.',
      required: true
    },
    avatar: {
      type: 'string',
      description: 'URL of an avatar image. Either local (/images/...) or Twitter profile picture URL for example.',
      required: true
    },
    twitter: {
      type: 'string',
      description: 'Twitter profile URL.',
      required: false
    }
  }
}))
