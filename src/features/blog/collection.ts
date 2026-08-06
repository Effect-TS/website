import type { SchemaContext } from "astro/content/config"
import { z } from "astro/zod"
import { reference } from "astro:content"

export const BlogPostEntry = ({ image }: SchemaContext) =>
  z.object({
    /**
     * The title of the blog post.
     */
    title: z.string().min(1),
    /**
     * A short summary shown in listings and used as the page description.
     */
    excerpt: z.string().min(1),
    /**
     * The publication date of the blog post.
     */
    date: z.date(),
    /**
     * Tag references used to categorize and filter the post.
     */
    tags: z.array(reference("blogTags")),
    /**
     * The post's author references. At least one is required.
     */
    authors: z.array(reference("blogAuthors")).min(1),
    /**
     * Marks the post to be shown in the blog index hero. At most one post
     * should be marked featured at a time.
     */
    featured: z.boolean().optional().default(false),
    /**
     * The cover image shown in the hero when the post is featured.
     */
    featuredImage: image().optional(),
  })
export type BlogPostEntry = z.infer<ReturnType<typeof BlogPostEntry>>

export const BlogAuthorEntry = z.object({
  /**
   * The author's display name.
   */
  name: z.string().min(1),
  /**
   * The author's title/role, shown alongside their name.
   */
  title: z.string().min(1),
  /**
   * A link to the author's profile.
   */
  url: z.string().url(),
})
export type BlogAuthorEntry = z.infer<typeof BlogAuthorEntry>

export const BlogTagEntry = z.object({
  /**
   * The tag's display name.
   */
  name: z.string().min(1),
})
export type BlogTagEntry = z.infer<typeof BlogTagEntry>
