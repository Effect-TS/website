import { AstroError } from "astro/errors"
import type { CollectionEntry } from "astro:content"
import fs from "node:fs/promises"
import * as NodePath from "node:path"
import SrtParser from "srt-parser-2"

/**
 * Transcripts live next to their episode entry and are read straight off disk
 * while rendering, so Astro cannot see them as a dependency. The episode page
 * hashes the file into its `cacheKey` to compensate — which means this path
 * helper has to be importable from `getStaticPaths`, and therefore cannot live
 * in the page frontmatter.
 */
export function podcastTranscriptPath(
  entry: CollectionEntry<"podcasts">,
): string {
  const episodeDir = NodePath.dirname(entry.filePath ?? "")
  return NodePath.join(NodePath.resolve(), episodeDir, "transcript.srt")
}

export async function readPodcastTranscript(
  entry: CollectionEntry<"podcasts">,
) {
  const path = podcastTranscriptPath(entry)

  let content: Buffer

  try {
    content = await fs.readFile(path)
  } catch {
    throw new AstroError(
      `Failed to read transcript file from \`${path}\`.`,
      `Make sure the transcript file path provided in the video entry frontmatter is correct.

- Entry: \`${entry.filePath}\`
- Transcript: \`${path}\``,
    )
  }

  return new SrtParser().fromSrt(content.toString())
}
