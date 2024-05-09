import { MDX } from "@/components/atoms/mdx"
import { allTutorials } from "contentlayer/generated"
import { Array, String } from "effect"
import * as FS from "fs/promises"
import { notFound } from "next/navigation"
import * as Path from "path"
import { Navigation } from "./components/Navigation"
import { Tutorial } from "./components/Tutorial"

export const generateStaticParams = () =>
  allTutorials.map((page) => ({
    slug: page.urlPath.replace("/tutorials/", "").split("/")
  }))

export async function generateMetadata({
  params: { slug }
}: {
  params: { slug: string[] }
}) {
  const page = allTutorials.find(
    (page) => page.urlPath === `/tutorials/${slug.join("/")}`
  )
  if (!page) return notFound()
  return {
    title: `${page.title} – Effect Tutorials`,
    description: page.excerpt
  }
}

export default async function Page({
  params: { slug }
}: {
  params: { slug: string[] }
}) {
  const index = allTutorials.findIndex(
    (page) => page.urlPath === `/tutorials/${slug.join("/")}`
  )
  const page = allTutorials[index]
  if (!page) return notFound()

  const next = allTutorials[index + 1]

  const filePrefix = page._raw.flattenedPath.replace("tutorials/", "")
  const name = filePrefix.replace("/", "-")
  const directory = `src/tutorials/${filePrefix}`
  const files = await FS.readdir(directory)
  const filesWithContent = await Promise.all(
    files.flatMap((file) => {
      if (file.endsWith(".solution.ts")) return []
      const initial = FS.readFile(Path.join(directory, file), "utf8")
      const solution = FS.readFile(
        Path.join(directory, file.replace(".ts", ".solution.ts")),
        "utf8"
      ).catch(() => undefined)
      return Promise.all([initial, solution]).then(
        ([initial, solution]) =>
          ({
            name: file,
            initial,
            solution
          }) as const
      )
    })
  )

  return (
    <Tutorial
      name={name}
      files={filesWithContent}
      navigation={<Navigation tutorial={page} />}
      next={
        next && {
          title: next.title,
          url: next.urlPath
        }
      }
    >
      <MDX content={page.body.code} />
    </Tutorial>
  )
}
