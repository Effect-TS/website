import { Mixedbread, toFile } from "@mixedbread/sdk"
import Glob from "fast-glob"
import Path from "node:path"
import Fs from "node:fs"

const mxbai = new Mixedbread({
  apiKey: process.env.MXBAI_API_KEY
})

const cwd = process.cwd()
const path = Path.join(cwd, "src/content/docs/docs/**/*.mdx")
const filePaths = await Glob(path)

const vectorStoreId = process.env.MXBAI_VECTOR_STORE_ID!
for (const filePath of filePaths) {
  const file = await toFile(
    Fs.createReadStream(filePath),
    Path.basename(filePath),
    { type: "text/markdown" }
  )
  const url = filePath.replace(Path.join(cwd, "src/content/docs"), "")
  await mxbai.vectorStores.files.upload(vectorStoreId, file, {
    metadata: {
      urlPath: url.split(".")[0],
    }
  })
}

console.log("Done!")
