import type { ReferenceDataEntry } from "astro:content"

/**
 * Represents the collection of episodes for Effect's Cause & Effect podcast.
 */
export interface PodcastData {
  /**
   * A list of all the podcast episodes ordered by descending episode number.
   */
  readonly episodes: ReadonlyArray<PodcastEpisode>
}

/**
 * Represents a single episode of Effect's Cause & Effect podcast.
 */
export interface PodcastEpisode {
  /**
   * The title of the podcast episode.
   */
  readonly title: string
  /**
   * An optional description of the podcast episode.
   */
  readonly description?: string | undefined
  /**
   * A non-zero integer representing the episode number.
   */
  readonly episodeNumber: number
  /**
   * The date and time when an episode was released.
   */
  readonly publicationDate: Date
  /**
   * The artwork for the episode.
   */
  readonly image: string
  /**
   * The duration of an episode in seconds.
   */
  readonly duration: number
  /**
   * A reference to the transcript for this podcast episode.
   */
  readonly transcript: ReferenceDataEntry<"transcripts", string>
  /**
   * The episode content, file size, and file type information.
   */
  readonly enclosure: {
    /**
     * The URL which points to the podcast media file.
     */
    readonly url: string
    /**
     * The file size in bytes.
     */
    readonly length: number
    /**
     * The type of the podcast media file.
     */
    readonly type: string
  }
  /**
   * The details of the YouTube video associated with the podcast.
   */
  readonly youtube: {
    /**
     * The YouTube identifier for the video.
     */
    readonly id: string
    /**
     * The optional title of the video on YouTube.
     */
    readonly title?: string | undefined
  }
  /**
   * Any tags associated with the podcast episode.
   */
  readonly tags: ReadonlyArray<string>
}
