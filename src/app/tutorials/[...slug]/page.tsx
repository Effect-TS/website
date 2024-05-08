import { MDX } from "@/components/atoms/mdx"
import { Tutorial as ITutorial, allTutorials } from "contentlayer/generated"
import { notFound } from "next/navigation"
import { Navigation } from "./components/Navigation"
import { Tutorial } from "./components/Tutorial"

export const generateStaticParams = () =>
  allTutorials.map((page, index) => ({
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
  const page = allTutorials.find(
    (page) => page.urlPath === `/tutorials/${slug.join("/")}`
  )
  if (!page) return notFound()

  return (
    <Tutorial
      workspace={page.workspace}
      navigation={<Navigation slug={slug} tutorial={page} />}
    >
      <MDX content={page.body.code} />
    </Tutorial>
  )
}
