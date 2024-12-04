import { reference, z } from "astro:content"

export const podcastSchema = z.object({
  /**
   * The details of the YouTube video associated with the podcast.
   */
  youtube: z.object({
    id: z.string().min(1),
    title: z.string().optional()
  }),
  /**
   * A reference to the transcript for this podcast episode.
   */
  transcript: reference("transcripts"),
  /**
   * The date of the blog post which must be a valid YAML timestamp.
   *
   * @see https://yaml.org/type/timestamp.html
   */
  date: z.date()
})

export type Podcast = z.TypeOf<typeof podcastSchema>
