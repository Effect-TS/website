import type { CollectionEntry } from "astro:content"
import { AstroError } from "astro/errors"
import fs from "node:fs/promises"
import * as NodePath from "node:path"

export async function readPodcastTranscriptContent(
  entry: CollectionEntry<"podcasts">,
): Promise<Buffer> {
  const episodeDir = NodePath.dirname(entry.filePath ?? "")
  const path = NodePath.join(NodePath.resolve(), episodeDir, "transcript.srt")

  try {
    return await fs.readFile(path)
  } catch {
    throw new AstroError(
      `Failed to read transcript file from \`${path}\`.`,
      `Make sure the transcript file path provided in the video entry frontmatter is correct.

- Entry: \`${entry.filePath}\`
- Transcript: \`${path}\``,
    )
  }
}
