import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import { isAbsolute, relative, resolve } from "node:path"
import type {
  ApiReferenceEntry,
  TypeDocProjectReflection,
} from "@website/domain/ApiReference"
import { TypeDocProjectReflection as TypeDocProjectReflectionSchema } from "@website/domain/ApiReference"
import * as Schema from "effect/Schema"

const defaultBaseDirectory = resolve(".data/api-reference")

export async function loadReflection(
  entry: ApiReferenceEntry,
  options?: { readonly baseDirectory?: string },
): Promise<TypeDocProjectReflection> {
  const baseDirectory = resolve(options?.baseDirectory ?? defaultBaseDirectory)
  const reflectionPath = resolve(baseDirectory, entry.reflectionPath)
  const relativePath = relative(baseDirectory, reflectionPath)
  if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
    throw new Error(
      `API reflection path escapes its dataset: ${entry.reflectionPath}`,
    )
  }

  const contents = await readFile(reflectionPath)
  const digest = createHash("sha256").update(contents).digest("hex")
  if (digest !== entry.reflectionDigest) {
    throw new Error(
      `API reflection checksum mismatch for ${entry.version}/${entry.packageSlug}/${entry.modulePath}: expected ${entry.reflectionDigest}, received ${digest}`,
    )
  }

  return Schema.decodeUnknownSync(TypeDocProjectReflectionSchema)(
    JSON.parse(contents.toString("utf8")),
  )
}
