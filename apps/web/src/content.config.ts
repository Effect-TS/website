import { file, glob } from "astro/loaders"
import { z } from "astro/zod"
import { defineCollection, reference } from "astro:content"
import { apiReferenceLoader } from "./features/api-reference/loader"
import { ApiReferenceContentEntry } from "./features/api-reference/schema"
import { PodcastEpisodeEntry } from "./features/podcast/collection"

const apiReference = defineCollection({
  loader: apiReferenceLoader({
    base: new URL("../.data/api-reference/", import.meta.url),
  }),
  schema: ApiReferenceContentEntry,
})

const blog = defineCollection({
  loader: glob({
    base: "./src/content/blog",
    pattern: [
      "cause-and-effect/*.mdx",
      "this-week-in-effect/*/index.mdx",
      "releases/effect/*.mdx",
      "releases/schema/*.mdx",
      "releases/*.mdx",
      "*.mdx",
    ],
  }),
  schema: ({ image }) =>
    z.object({
      title: z.string().min(1),
      excerpt: z.string().min(1),
      date: z.date(),
      readingTime: z.string().min(1).optional(),
      tags: z.array(reference("blogTags")),
      authors: z.array(reference("blogAuthors")).min(1),
      featured: z.boolean().optional().default(false),
      featuredImage: image().optional(),
    }),
})

const blogAuthors = defineCollection({
  loader: file("./src/content/blog/authors.json"),
  schema: z.object({
    name: z.string().min(1),
    title: z.string().min(1),
    url: z.url(),
  }),
})

const blogTags = defineCollection({
  loader: file("./src/content/blog/tags.json"),
  schema: z.object({
    name: z.string().min(1),
  }),
})

const podcasts = defineCollection({
  loader: glob({ base: "./src/content/podcasts", pattern: "**/*.{md,mdx}" }),
  schema: PodcastEpisodeEntry,
})

const merch = defineCollection({
  loader: file("./src/content/merch.json"),
  schema: z.object({
    name: z.string(),
    price: z.string(),
    images: z.array(z.string()),
    buyUrl: z.url(),
    infoUrl: z.url(),
  }),
})

const effectJobs = defineCollection({
  loader: file("./src/content/effect-jobs.json"),
  schema: z.object({
    company: z.string(),
    role: z.string(),
    location: z.string().optional(),
    type: z.string().optional(),
    url: z.url(),
    note: z.string().optional(),
    logo: z.string().optional(),
    payRange: z.string().optional(),
    description: z.string().optional(),
  }),
})

const effectJobsLogos = defineCollection({
  loader: file("./src/content/effect-jobs-logos.json"),
  schema: z.object({
    name: z.string(),
    logo: z.string(),
    url: z.url().optional(),
    h: z.string().optional(),
    invert: z.boolean().optional(),
  }),
})

const docsSidebar = defineCollection({
  loader: file("./src/content/docs/sidebar-config.json"),
  schema: z.record(z.string(), z.number()),
})

const docs = defineCollection({
  loader: glob({
    base: "./src/content/docs",
    pattern: "**/[^_]*.{md,mdx}",
  }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    diataxis: z
      .enum(["tutorial", "how-to", "reference", "explanation"])
      .optional(),
    sidebar: z
      .object({
        label: z.string().optional(),
        order: z.number().optional(),
        hidden: z.boolean().optional(),
      })
      .optional(),
    tableOfContents: z
      .union([
        z.boolean(),
        z.object({
          minHeadingLevel: z.number().optional(),
          maxHeadingLevel: z.number().optional(),
        }),
      ])
      .optional(),
    draft: z.boolean().optional(),
  }),
})

export const collections = {
  apiReference,
  docs,
  docsSidebar,
  blog,
  blogAuthors,
  blogTags,
  podcasts,
  merch,
  effectJobs,
  effectJobsLogos,
}
