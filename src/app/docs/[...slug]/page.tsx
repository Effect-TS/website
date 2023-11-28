import {Breadcrumbs} from '@/components/atoms/breadcrumbs'
import {MDX} from '@/components/atoms/mdx'
import {TableOfContents} from '@/components/docs/table-of-contents'
import {getBreadcrumbs} from '@/contentlayer/utils/get-breadcrumbs'
import {allDocsPages} from 'contentlayer/generated'
import {notFound} from 'next/navigation'

export default function Doc({params: {slug}}: {params: {slug: string[]}}) {
  const page = allDocsPages.find((page) => page.urlPath === `/docs/${slug.join('/')}`)
  if (!page) notFound()
  const breadcrumbs = getBreadcrumbs(page.pathSegments)

  return (
    <>
      <main className="px-12 pb-24 -mt-2 grow">
        <Breadcrumbs elements={breadcrumbs} />
        <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl text-white mb-12">{page.title}</h2>
        <MDX content={page.body.code} />
      </main>
      <TableOfContents
        elements={page.headings}
        githubLink={`https://github.com/Effect-TS/website/blob/website-redesign/content/${page._raw.sourceFilePath}`}
      />
    </>
  )
}
