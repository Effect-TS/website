import algoliasearch from "algoliasearch"
import { allDocsPages } from "../../.contentlayer/generated/index.mjs"

const updateAlgoliaIndex = async () => {
  try {
    const client = algoliasearch("BB6ZVASVH8", process.env.ALGOLIA_API_KEY)
    const index = client.initIndex("effect-docs")
    const objects = allDocsPages.map((page) => {
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
        sections: page.sections,
        urlPath: page.urlPath,
        chapter,
        chapterOrder
      }
    })
    const res = await index.replaceAllObjects(objects)
    console.log(res)
  } catch (error) {
    console.log(error)
  }
}

updateAlgoliaIndex()
