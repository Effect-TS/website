import { FC } from "react"
import { Divider } from "../layout/divider"
import { allBlogPosts } from "contentlayer/generated"
import Link from "next/link"
import { Icon } from "../icons"
import { format } from "date-fns"

export const RelatedPosts: FC<{ slugs: string[] }> = ({ slugs }) => {
  const posts = slugs.map((slug) => {
    const post = allBlogPosts.find((post) => post.urlPath === `/blog/${slug}`)
    if (!post) return undefined
    return { title: post.title, excerpt: post.excerpt, date: post.date, urlPath: post.urlPath, authors: post.authors }
  })

  return (
    <div>
      <div className="-mx-12">
        <Divider className="my-16" />
      </div>
      <h3 className="font-display mb-9 text-2xl sm:text-3xl text-black dark:text-white">Related Posts</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {posts.map(
          (post, index) =>
            post && (
              <Link
                href={post.urlPath}
                key={index}
                className="bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-800 dark:to-zinc-900 rounded-2xl p-6 transition-transform duration-200 hover:scale-[1.01]"
              >
                <h3 className="font-display text-xl text-black dark:text-white mb-4">{post.title}</h3>
                <p className="text-sm">{format(new Date(post.date), "LLL. do, yyyy")}</p>
                <p className="text-sm">
                  By{" "}
                  {post.authors.map(({ name }, index) => (
                    <span key={index}>
                      {index > 0 && <span>, </span>}
                      <span>{name}</span>
                    </span>
                  ))}
                </p>
                <p className="my-4">{post.excerpt}</p>
                <p className="flex items-center gap-2 text-black font-normal dark:font-light dark:text-white">
                  <span>Read more</span>
                  <Icon name="arrow-right" className="h-3.5" />
                </p>
              </Link>
            )
        )}
      </div>
    </div>
  )
}
