import { MDX } from "@/components/atoms/mdx"
import { allTutorials } from "contentlayer/generated"
import * as FS from "fs/promises"
import { notFound } from "next/navigation"
import * as Path from "path"
import { Navigation } from "./components/Navigation"
import { Tutorial } from "./components/Tutorial"
import { groupedTutorials, tutorialSection } from "../grouped"
import Package from "../../../../package.json"

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
  const page = allTutorials.find(
    (page) => page.urlPath === `/tutorials/${slug.join("/")}`
  )
  if (!page) return notFound()

  const group = groupedTutorials[tutorialSection(page)]
  const index = group.children.indexOf(page)
  const next = group.children[index + 1]

  const name = page._raw.flattenedPath
    .replace("tutorials/", "")
    .replace("/", "-")
  const directory = Path.join(
    "src/tutorials",
    page._raw.sourceFileDir.replace("tutorials/", ""),
    `${page.order}`
  )
  const files = await FS.readdir(directory)
  const filesWithContent = await Promise.all(
    files.flatMap((file) => {
      if (!file.endsWith(".ts")) return []
      const solution = FS.readFile(Path.join(directory, file), "utf8")
      const initial = FS.readFile(
        Path.join(directory, file.replace(".ts", ".initial.txt")),
        "utf8"
      ).catch(() => solution)
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
      packageJson={JSON.stringify(tutorialPackageJson, null, 2)}
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

// package.json

const allDeps = {
  ...Package.dependencies,
  ...Package.devDependencies
}
const version = (name: keyof typeof allDeps) =>
  allDeps[name].replace(/^\^/, "")

const tutorialPackageJson = {
  type: "module",
  dependencies: {
    effect: version("effect"),
    "@effect/platform": version("@effect/platform"),
    "@effect/platform-node": version("@effect/platform-node"),
    "@effect/schema": version("@effect/schema"),
    tsx: "latest"
  }
}
