import { MDX } from "@/components/atoms/mdx"
import { allTutorials } from "contentlayer/generated"
import { notFound } from "next/navigation"
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
  const page = allTutorials.find(
    (page) => page.urlPath === `/tutorials/${slug.join("/")}`
  )
  if (!page) return notFound()

  return (
    <>
      <Tutorial workspace={page.workspace}>
        <MDX content={page.body.code} />
      </Tutorial>
    </>
  )
}
