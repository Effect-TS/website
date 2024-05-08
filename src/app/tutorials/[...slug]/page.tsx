import { MDX } from "@/components/atoms/mdx"
import { Tutorial as ITutorial, allTutorials } from "contentlayer/generated"
import { notFound } from "next/navigation"
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

export default function Page({
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

  return (
    <Tutorial
      workspace={page.workspace}
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
