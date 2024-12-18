import { glob } from "astro/loaders"
import { defineCollection, z } from "astro:content"
import { docsLoader } from "@astrojs/starlight/loaders"
import { docsSchema } from "@astrojs/starlight/schema"
import { blogSchema } from "starlight-blog/schema"
import { podcastSchema } from "@/lib/schema/podcast"

export const collections = {
  docs: defineCollection({
    loader: docsLoader(),
    schema: docsSchema({
      extend: (context) => z.union([podcastSchema, blogSchema(context)])
    })
  }),
  transcripts: defineCollection({
    loader: glob({
      pattern: "**/*.json",
      base: "./src/data/transcripts"
    }),
    schema: z.array(
      z.object({
        id: z.string(),
        startTime: z.string(),
        startSeconds: z.number(),
        endTime: z.string(),
        endSeconds: z.number(),
        text: z.string()
      })
    )
  })
}
