import { Mixedbread, toFile } from "@mixedbread/sdk"
import Glob from "fast-glob"
import Path from "node:path"
import Fs from "node:fs"
import Crypto from "node:crypto"
import { execSync } from "node:child_process"

const mxbai = new Mixedbread({
  apiKey: process.env.MXBAI_API_KEY
})

const cwd = process.cwd()
const contentRoot = Path.join(cwd, "src/content/docs")
const filePaths = await Glob(Path.join(contentRoot, "docs/**/*.mdx"))

const storeId = process.env.MXBAI_VECTOR_STORE_ID!

// Store-level config can only be set at creation time. `file_path` is embedded
// into each chunk's context alongside the LLM-generated file context; the
// `mxbai store sync` CI workflow writes the same metadata field.
try {
  await mxbai.stores.retrieve(storeId)
} catch (error: any) {
  if (error?.status !== 404) throw error
  await mxbai.stores.create({
    name: storeId,
    description: "Effect documentation",
    config: {
      contextualization: {
        with_file_context: true,
        with_metadata: ["file_path"]
      }
    }
  })
}

function git(command: string): string {
  try {
    return execSync(command, { encoding: "utf8" }).trim()
  } catch {
    return "unknown"
  }
}

const gitCommit = process.env.VERCEL_GIT_COMMIT_SHA ?? git("git rev-parse HEAD")
const gitBranch = process.env.VERCEL_GIT_COMMIT_REF ?? git("git rev-parse --abbrev-ref HEAD")
const uploadedAt = new Date().toISOString()

for (const filePath of filePaths) {
  const content = Fs.readFileSync(filePath)
  const file = await toFile(
    content,
    Path.basename(filePath),
    { type: "text/markdown" }
  )
  const url = filePath.replace(contentRoot, "")
  const relPath = Path.relative(contentRoot, filePath)
  await mxbai.stores.files.upload(storeId, file, {
    metadata: {
      urlPath: url.split(".")[0],
      // fields required by the search API schema (src/services/search/domain.ts);
      // file_path is also contextualized via the store's `with_metadata` config
      synced: true,
      file_hash: Crypto.createHash("sha256").update(content).digest("hex"),
      file_path: Path.relative(cwd, filePath),
      git_branch: gitBranch,
      git_commit: gitCommit,
      uploaded_at: uploadedAt
    },
    external_id: relPath,
    overwrite: true,
    // `max_chunk_size` is accepted by the API but missing from the sdk@0.77 types
    config: {
      max_chunk_size: 500
    } as any
  })
}

console.log("Done!")
