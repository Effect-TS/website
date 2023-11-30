import {allDocsPages} from 'contentlayer/generated'
import {FC} from 'react'
import Link from 'next/link'
import {Icon} from '../icons'

export const ChildCards: FC<{path: string}> = ({path}) => {
  const length = path.split('/').length
  const children = allDocsPages
    .filter((page) => page.urlPath.startsWith(path) && page.urlPath.split('/').length === length + 1)
    .map((page) => ({title: page.title, excerpt: page.excerpt, urlPath: page.urlPath}))

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {children.map(({title, excerpt, urlPath}, index) => (
        <Link href={urlPath} key={index} className="bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-2xl p-6">
          <h3 className="font-display text-xl text-white">{title}</h3>
          <p className="my-4">{excerpt}</p>
          <p className="flex items-center gap-2 text-white">
            <span>Read more</span>
            <Icon name="arrow-right" className="h-3.5" />
          </p>
        </Link>
      ))}
    </div>
  )
}
