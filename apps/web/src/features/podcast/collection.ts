import { z } from "astro/zod"

export const PodcastChapterEntry = z.object({
  /**
   * The display timestamp for the chapter.
   */
  start: z.string().regex(/^(?:\d{2}:)?\d{2}:\d{2}$/),
  /**
   * The chapter title.
   */
  title: z.string().min(1),
})
export type PodcastChapterEntry = z.infer<typeof PodcastChapterEntry>

export const PodcastEpisodeEntry = z.object({
  /**
   * The ordinal number of the episode.
   */
  episodeNumber: z.int().positive(),
  /**
   * The title of the podcast episode.
   */
  title: z.string().min(1),
  /**
   * The description of the podcast episode.
   */
  description: z.string().min(1),
  /**
   * The podcast guest.
   */
  guest: z.string().min(1),
  /**
   * The company that the podcast guest is employed by.
   */
  company: z.string().min(1),
  /**
   * The date when an episode was released.
   */
  date: z.iso.date(),
  /**
   * The duration of an episode in seconds.
   */
  duration: z.number().int().min(1),
  /**
   * The identifier of the YouTube video.
   */
  youtubeId: z.string().min(1),
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
    type: z.string().min(1),
  }),
  /**
   * The direct links to the podcast episode on external platforms.
   */
  links: z.object({
    /**
     * The link to the podcast episode on Apple Podcasts.
     */
    apple: z.string().min(1),
    /**
     * The link to the podcast episode on Spotify.
     */
    spotify: z.string().min(1),
    /**
     * The link to the podcast episode on YouTube.
     */
    youtube: z.string().min(1),
  }),
  /**
   * The list of tags associated with the podcast episode.
   */
  tags: z.array(z.string()),
  /**
   * Chapter markers shown alongside the video.
   */
  chapters: z.array(PodcastChapterEntry),
})

export type PodcastEpisodeEntry = z.infer<typeof PodcastEpisodeEntry>
