import { defineCollection } from "astro:content"
import { docsLoader } from "@astrojs/starlight/loaders"
import { docsSchema } from "@astrojs/starlight/schema"
import { blogSchema } from "starlight-blog/schema"
import { podcastSchema } from "@/lib/podcast"

export const collections = {
  docs: defineCollection({
    loader: docsLoader(),
    schema: docsSchema({
      extend: (context) => blogSchema(context).extend({
        podcast: podcastSchema(context).optional()
      })
    })
  })
};
