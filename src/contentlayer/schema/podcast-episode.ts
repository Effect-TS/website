import { defineDocumentType } from "@contentlayer/source-files"
import { urlFromFilePath } from "../utils/url-from-file-path"
import { transcriptFromSrt } from "../utils/transcript-from-srt"

export const PodcastEpisode = defineDocumentType(() => ({
  name: "PodcastEpisode",
  filePathPattern: `podcast/notes/*.mdx`,
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
    }
  },
  computedFields: {
    urlPath: {
      type: "string",
      description: "The URL path of this episode page relative to site root.",
      resolve: (episode) => {
        const urlPath = urlFromFilePath(episode)
        return urlPath.replace("notes/", "")
      }
    },
    transcript: {
      type: "json",
      description: "Transcript read from the .srt file.",
      resolve: transcriptFromSrt
    }
  },
  extensions: {}
}))
