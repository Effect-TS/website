import { allBlogPosts } from "contentlayer/generated"
import type { NextApiRequest, NextApiResponse } from "next"

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { slug } = req.query
  const post = allBlogPosts.find((post) => post.urlPath === `/blog/${slug}`)!
  if (!post) {
    return res.status(404).json({ message: "Not found" })
  }
  return res.status(200).json(post)
}
