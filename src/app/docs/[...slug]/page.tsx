import { Breadcrumbs } from "@/components/atoms/breadcrumbs"
import { MDX } from "@/components/atoms/mdx"
import { ChildCards } from "@/components/docs/child-cards"
import { Pagination } from "@/components/docs/pagination"
import { TableOfContents } from "@/components/docs/table-of-contents"
import { Divider } from "@/components/layout/divider"
import { getBreadcrumbs } from "@/contentlayer/utils/get-breadcrumbs"
import { allDocsPages } from "contentlayer/generated"
import { notFound } from "next/navigation"

export const generateStaticParams = () =>
  allDocsPages.map((page) => ({
    slug: page.urlPath.replace("/docs/", "").split("/")
  }))

export async function generateMetadata({ params: { slug } }: { params: { slug: string[] } }) {
  const page = allDocsPages.find((page) => page.urlPath === `/docs/${slug.join("/")}`)!
  return {
    title: `${page.title} – Effect Docs`,
    description: page.excerpt
  }
}

export default function Page({ params: { slug } }: { params: { slug: string[] } }) {
  const page = allDocsPages.find((page) => page.urlPath === `/docs/${slug.join("/")}`)
  if (!page) notFound()
  const breadcrumbs = getBreadcrumbs(page.pathSegments)

  return (
    <>
      <main className="px-12 pb-24 -mt-2 grow">
        <Breadcrumbs elements={breadcrumbs} />
        <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl text-black dark:text-white mb-12">{page.title}</h2>
        <MDX content={page.body.code} />
        {page.bottomNavigation !== "none" && (
          <div className="-mx-12">
            <Divider className="my-16" />
          </div>
        )}
        {page.bottomNavigation === "childCards" && <ChildCards path={page.urlPath} />}
        {page.bottomNavigation === "pagination" && <Pagination path={page.urlPath} />}
      </main>
      <TableOfContents elements={page.headings} pageFilePath={page._raw.sourceFilePath} pageTitle={page.title} />
    </>
  )
}
