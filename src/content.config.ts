import { file, glob } from "astro/loaders"
import { z } from "astro/zod"
import { defineCollection } from "astro:content"
import { BlogAuthorEntry, BlogPostEntry, BlogTagEntry } from "./features/blog/collection"
import { PodcastEpisodeEntry } from "./features/podcast/collection"

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
  schema: BlogPostEntry,
})

const blogAuthors = defineCollection({
  loader: file("./src/content/blog/authors.json"),
  schema: BlogAuthorEntry,
})

const blogTags = defineCollection({
  loader: file("./src/content/blog/tags.json"),
  schema: BlogTagEntry,
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
    buyUrl: z.string().url(),
    infoUrl: z.string().url(),
  }),
})

const effectJobs = defineCollection({
  loader: file("./src/content/effect-jobs.json"),
  schema: z.object({
    company: z.string(),
    role: z.string(),
    location: z.string().optional(),
    type: z.string().optional(),
    url: z.string().url(),
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
    url: z.string().url().optional(),
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
