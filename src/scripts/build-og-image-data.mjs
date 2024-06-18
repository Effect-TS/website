import { allBlogPosts } from "../../.contentlayer/generated/index.mjs"
import fs from "fs"

const buildOGImageData = async () => {
  try {
    const data = allBlogPosts.map(({ title, excerpt, urlPath }) => ({
      title,
      excerpt,
      urlPath
    }))
    fs.mkdirSync(".og-image-data")
    fs.writeFileSync(
      ".og-image-data/index.json",
      JSON.stringify(data),
      (error) => console.log(error)
    )
  } catch (error) {
    console.log(error)
  }
}

buildOGImageData()
