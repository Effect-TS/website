import { Breadcrumbs } from "@/components/atoms/breadcrumbs"
import { MDX } from "@/components/atoms/mdx"
import { ChildCards } from "@/components/docs/child-cards"
import { MobileNavigation } from "@/components/docs/mobile-navigation"
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
      <main className="shrink grow md:pl-12 xl:pr-12 pb-24 -mt-2 flex flex-col md:items-center xl:items-start">
        <Breadcrumbs elements={breadcrumbs} />
        <div className="w-full max-w-2xl flex items-center mb-12">
          <MobileNavigation className="md:hidden" />
          <h2 className="grow shrink font-display text-2xl sm:text-3xl lg:text-4xl text-black dark:text-white">{page.title}</h2>
        </div>
        <MDX content={page.body.code} />
        {page.bottomNavigation !== "none" && (
          <div className="w-full">
            <div className="-mx-12">
              <Divider className="my-16" />
            </div>
          </div>
        )}
        {page.bottomNavigation === "childCards" && <ChildCards path={page.urlPath} />}
        {page.bottomNavigation === "pagination" && <Pagination path={page.urlPath} />}
      </main>
      <TableOfContents elements={page.headings} pageFilePath={page._raw.sourceFilePath} pageTitle={page.title} />
    </>
  )
}
