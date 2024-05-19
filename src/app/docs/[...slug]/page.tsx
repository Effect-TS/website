import { Breadcrumbs } from "@/components/atoms/breadcrumbs"
import { MDX } from "@/components/atoms/mdx"
import { ChildCards } from "@/components/docs/child-cards"
import { MobileNavigation } from "@/components/docs/mobile-navigation"
import { MobileTableOfContents } from "@/components/docs/mobile-table-of-contents"
import { Pagination } from "@/components/docs/pagination"
import { TableOfContents } from "@/components/docs/table-of-contents"
import { Divider } from "@/components/layout/divider"
import { getBreadcrumbs } from "@/contentlayer/utils/get-breadcrumbs"
import { allDocsPages } from "contentlayer/generated"
import { formatDistance } from "date-fns"
import { notFound } from "next/navigation"

export const generateStaticParams = () =>
  allDocsPages.map((page) => ({
    slug: page.urlPath.replace("/docs/", "").split("/")
  }))

export async function generateMetadata({
  params: { slug }
}: {
  params: { slug: string[] }
}) {
  const page = allDocsPages.find(
    (page) => page.urlPath === `/docs/${slug.join("/")}`
  )
  if (!page) return
  return {
    title: `${page.title} – Effect Docs`,
    description: page.excerpt
  }
}

export default function Page({
  params: { slug }
}: {
  params: { slug: string[] }
}) {
  const page = allDocsPages.find(
    (page) => page.urlPath === `/docs/${slug.join("/")}`
  )
  if (!page) notFound()
  const breadcrumbs = getBreadcrumbs(page.pathSegments)

  return (
    <>
      <main className="relative z-10 shrink grow max-w-[864px] md:pl-12 xl:pr-12 pb-24 -mt-2">
        <Breadcrumbs elements={breadcrumbs} />
        <div className="flex items-start">
          <MobileNavigation className="mt-2 md:hidden" />
          <h2 className="grow shrink font-display text-2xl sm:text-3xl lg:text-4xl text-black dark:text-white">
            {page.title}
          </h2>
        </div>
        {/*
        page.lastEdited && (
          <div className="text-sm h-4 mt-1.5 mb-6">
            Last edited{" "}
            {formatDistance(new Date(), new Date(page.lastEdited))} ago.
          </div>
        )
        */}
        <MobileTableOfContents
          elements={page.headings}
          pageFilePath={page._raw.sourceFilePath}
          pageTitle={page.title}
        />
        <div className="mt-6 xl:mt-12">
          <MDX content={page.body.code} />
        </div>
        {page.bottomNavigation !== "none" && (
          <div className="w-full">
            <Divider className="my-16" />
          </div>
        )}
        {page.bottomNavigation === "childCards" && (
          <ChildCards path={page.urlPath} />
        )}
        {page.bottomNavigation === "pagination" && (
          <Pagination path={page.urlPath} />
        )}
      </main>
      <TableOfContents
        elements={page.headings}
        pageFilePath={page._raw.sourceFilePath}
        pageTitle={page.title}
      />
    </>
  )
}
