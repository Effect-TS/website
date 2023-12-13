import { Author } from "@/components/atoms/author"
import { MDX } from "@/components/atoms/mdx"
import { RelatedPosts } from "@/components/blog/related-posts"
import { TableOfContents } from "@/components/docs/table-of-contents"
import { Icon } from "@/components/icons"
import { allBlogPosts } from "contentlayer/generated"
import { format } from "date-fns"
import Link from "next/link"
import { notFound } from "next/navigation"

export async function generateMetadata({ params: { slug } }: { params: { slug: string[] } }) {
  const post = allBlogPosts.find((post) => post.urlPath === `/blog/${slug}`)!
  return {
    title: `${post.title} – Effect Blog`,
    description: post.excerpt
  }
}

export default function Page({ params: { slug } }: { params: { slug: string } }) {
  const post = allBlogPosts.find((post) => post.urlPath === `/blog/${slug}`)
  if (!post) notFound()

  return (
    <div className="docs-container relative w-full max-w-screen-xl mx-auto px-4 sm:px-8 lg:px-16 pt-16 flex items-start">
      <aside className="shrink-0 sticky top-32 sm:top-40 mb-16 flex flex-col w-64">
        <div className="text-white uppercase text-sm font-semibold h-8 flex items-end mb-9">{post.authors.length > 1 ? "Authors" : "Author"}</div>
        {post.authors.map((author, index) => (
          <Author key={index} {...author} />
        ))}
      </aside>
      <main className="px-12 pb-24 -mt-2 grow">
        <div className="flex gap-2 items-center -mt-5 mb-1 h-4 text-sm">
          <Link href="/blog" className="hover:text-white">
            Blog
          </Link>
          <Icon name={"chevron-right"} className="h-2.5 text-zinc-600" />
        </div>
        <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl text-white">{post.title}</h2>
        <div className="text-sm h-4 mt-1.5 mb-6">{format(new Date(post.date), "MMM do, yyyy")}</div>
        <MDX content={post.body.code} />
        {post.relatedPosts && <RelatedPosts slugs={post.relatedPosts} />}
      </main>
      <TableOfContents elements={post.headings} />
    </div>
  )
}
