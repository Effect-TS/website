import type { CollectionEntry } from "astro:content"

/**
 * The metadata a blog post's page gives its layout. Its Open Graph image is
 * keyed on it, so anything showing that image should use this too.
 */
export const blogPostMetadata = (post: CollectionEntry<"blog">) => ({
  title: `${post.data.title} | Effect Blog`,
  description: post.data.excerpt,
})
