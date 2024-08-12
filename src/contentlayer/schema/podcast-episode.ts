import { defineDocumentType } from "@contentlayer/source-files"
import { urlFromFilePath } from "../utils/url-from-file-path"

export const PodcastEpisode = defineDocumentType(() => ({
  name: "PodcastEpisode",
  filePathPattern: `podcast/**/*.mdx`,
  contentType: "mdx",
  fields: {
    id: {
      type: "number",
      description: "The number of the episode",
      required: true
    },
    title: {
      type: "string",
      description: "The title of the episode.",
      required: true
    },
    excerpt: {
      type: "string",
      description: "A brief description of the content.",
      required: true
    },
    date: {
      type: "date",
      description: "Publishing date.",
      required: true
    },
    youtubeId: {
      type: "string",
      description: "The video id of the YouTube video.",
      required: true
    },
    thumbnail: {
      type: "string",
      description: "The url/path of the thumbnail image.",
      required: true
    }
  },
  computedFields: {
    urlPath: {
      type: "string",
      description: "The URL path of this episode page relative to site root.",
      resolve: urlFromFilePath
    }
  },
  extensions: {}
}))
