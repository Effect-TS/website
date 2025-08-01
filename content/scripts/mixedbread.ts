import { Mixedbread, toFile } from "@mixedbread/sdk"
import Glob from "fast-glob"
import Path from "node:path"
import Fs from "node:fs"
import FrontMatter from "front-matter"

const mxbai = new Mixedbread({
  apiKey: process.env.MXBAI_API_KEY
})


const cwd = process.cwd()
const path = Path.join(cwd, "src/content/docs/docs/ai/**/*.mdx")
const filePaths = await Glob(path)

interface Attributes {
  readonly title?: string
  readonly description?: string
}

const vectorStoreId = process.env.MXBAI_VECTOR_STORE_ID
for (const filePath of filePaths) {
  const file = await toFile(Fs.createReadStream(filePath))
  const text = await file.text()
  const frontmatter = FrontMatter<Attributes>(text)
  const url = filePath.replace(Path.join(cwd, "src/content/docs"), "")
  await mxbai.vectorStores.files.upload(vectorStoreId, file, {
    metadata: {
      title: frontmatter.attributes.title ?? "",
      url: url.split(".")[0],
      description: frontmatter.attributes.description ?? ""
    }
  })
}

console.log("Done!")
