import {MDX} from '@/components/atoms/mdx'
import {allDocsPages} from 'contentlayer/generated'
import {notFound} from 'next/navigation'

export default function Doc({params: {slug}}: {params: {slug: string[]}}) {
  const page = allDocsPages.find((page) => page.urlPath === `/docs/${slug.join('/')}`)
  if (!page) notFound()

  return (
    <>
      <main className="pl-24 pb-24 -mt-2">
        <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl text-white mb-16">{page.title}</h2>
        <MDX content={page.body.code} />
      </main>
    </>
  )
}
