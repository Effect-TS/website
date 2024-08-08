import { allBlogPosts, allPodcastEpisodes } from "contentlayer/generated"
import type { NextApiRequest, NextApiResponse } from "next"

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { slug } = req.query
  const episode = allPodcastEpisodes.find(
    (episode) => episode.urlPath === `/podcast/${slug}`
  )!
  if (!episode) {
    return res.status(404).json({ message: "Not found" })
  }
  return res.status(200).json(episode)
}
