import algoliasearch from "algoliasearch"
import {
  allBlogPosts,
  allDocsPages
} from "../../.contentlayer/generated/index.mjs"

const updateAlgoliaIndex = async () => {
  try {
    const client = algoliasearch("BB6ZVASVH8", process.env.ALGOLIA_API_KEY)
    const index = client.initIndex("effect-docs")
    let objects = allDocsPages.map((page) => {
      const chapterPath = `/docs/${page.pathSegments[0].pathName}`
      const chapterOrder = page.pathSegments[0].order
      const chapter =
        chapterPath === page.urlPath
          ? "Start"
          : allDocsPages.find((page) => page.urlPath === chapterPath).title
      return {
        objectID: page._id,
        title: page.title,
        excerpt: page.excerpt,
        content: `${page.excerpt}\n${page.sections
          .map((section) => `${section.heading.title}\n${section.content}`)
          .join("\n")}`,
        urlPath: page.urlPath,
        chapter,
        chapterOrder
      }
    })
    objects.push(
      ...allBlogPosts.map((post) => {
        return {
          objectID: post._id,
          title: post.title,
          excerpt: post.excerpt,
          content: `${post.excerpt}\n${post.sections
            .map((section) => `${section.heading.title}\n${section.content}`)
            .join("\n")}`,
          urlPath: post.urlPath,
          chapter: "Blog"
        }
      })
    )
    const res = await index.replaceAllObjects(objects)
    console.log(res)
  } catch (error) {
    console.log(error)
  }
}

updateAlgoliaIndex()
