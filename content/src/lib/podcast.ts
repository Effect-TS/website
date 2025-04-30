import type { GetStaticPathsResult } from "astro"
import { getCollection, z } from "astro:content"
import type { CollectionEntry, SchemaContext } from "astro:content"

export type Podcast = z.TypeOf<ReturnType<typeof podcastSchema>>

export type PodcastEntry = CollectionEntry<"docs"> & {
  readonly data: CollectionEntry<"docs">["data"] & {
    readonly podcast: Podcast
  }
}

export function isPodcastEntry(entry: CollectionEntry<"docs">): entry is PodcastEntry {
  return entry.data.podcast !== undefined
}

export async function getPodcastEntries() {
  const entries = await getCollection("docs", isPodcastEntry)
  return entries.sort(orderByPublicationDate)
}

function orderByPublicationDate(a: PodcastEntry, b: PodcastEntry): number {
  const publicationDateA = a.data.podcast.publicationDate.getTime()
  const publicationDateB = b.data.podcast.publicationDate.getTime()
  return publicationDateB - publicationDateA
}

export async function getPodcastStaticPaths() {
  const entries = await getPodcastEntries()
  const episodes = entries.sort(orderByEpisodeNumber).map((entry) => ({
    id: entry.id,
    title: entry.data.title,
    description: entry.data.description,
    duration: entry.data.podcast.duration,
    episodeNumber: entry.data.podcast.episodeNumber,
    publicationDate: entry.data.podcast.publicationDate,
    youtube: entry.data.podcast.youtube
  }))
  return [
    {
      params: {
        prefix: "podcast"
      },
      props: {
        episodes
      }
    }
  ] satisfies GetStaticPathsResult
}

function orderByEpisodeNumber(a: PodcastEntry, b: PodcastEntry): number {
  const episodeNumberA = a.data.podcast.episodeNumber
  const episodeNumberB = b.data.podcast.episodeNumber
  return episodeNumberB - episodeNumberA
}

export function podcastSchema(_context: SchemaContext) {
  return z.object({
    /**
     * A non-zero integer representing the episode number.
     */
    episodeNumber: z.number().int().min(1),
    /**
     * The relative path from the root of the project to the transcript file
     * of the video. The transcript file must be in the SubRip format (`.srt`).
     *
     * @see https://en.wikipedia.org/wiki/SubRip
     */
    transcript: z.string(),
    /**
     * The artwork for the episode.
     */
    image: z.string(),
    /**
     * The date and time when an episode was released.
     */
    publicationDate: z
      .string()
      .datetime({ offset: true })
      .transform((s) => new Date(s)),
    /**
     * The duration of an episode in seconds.
     */
    duration: z.number().int().min(1),
    /**
     * The episode content, file size, and file type information.
     */
    enclosure: z.object({
      /**
       * The URL which points to the podcast media file.
       */
      url: z.string().min(1),
      /**
       * The file size in bytes.
       */
      length: z.number().int(),
      /**
       * The type of the podcast media file.
       */
      type: z.string().min(1)
    }),
    /**
     * The details of the YouTube video associated with the podcast.
     */
    youtube: z.object({
      id: z.string().min(1),
      title: z.string().optional()
    }),
    /**
     * The list of tags associated with the podcast episode.
     */
    tags: z.array(z.string())
  })
}
