import { allBlogPosts, allDocsPages } from "contentlayer/generated"
import { MetadataRoute } from "next"

const basePath = "https://effect.website"

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: basePath + "/",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1
    }, //@ts-ignore
    ...allDocsPages.map(({ urlPath, lastEdited }) => ({
      url: basePath + urlPath,
      lastModified: new Date(lastEdited),
      changeFrequency: "monthly",
      priority: 1
    })), //@ts-ignore
    ...allBlogPosts.map(({ urlPath, date }) => ({
      url: basePath + urlPath,
      lastModified: new Date(date),
      changeFrequency: "monthly",
      priority: 1
    }))
  ]
}
