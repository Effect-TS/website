import {DocsPage, allDocsPages} from 'contentlayer/generated'
import {Search} from '../atoms/search'
import {NavigationLink} from './navigation-link'

const generateDocsNavigation = ({pages, parents}: {pages: DocsPage[]; parents: string[]}): DocsNavElement[] => {
  const level = parents.length
  return pages
    .filter((page) => page.pathSegments.length === level + 1 && page.urlPath.startsWith(`/docs/${parents.join('/')}`))
    .sort((pageA, pageB) => pageA.pathSegments[level].order - pageB.pathSegments[level].order)
    .map((page) => ({
      title: page.navTitle ?? page.title,
      urlPath: page.urlPath,
      collapsible: page.collapsible ?? false,
      children: generateDocsNavigation({pages, parents: page.pathSegments.map((segment: PathSegment) => segment.pathName)})
    }))
}

export const Navigation = () => {
  const elements = generateDocsNavigation({pages: allDocsPages, parents: []})

  return (
    <aside className="relative flex flex-col w-56 -ml-4">
      <div className="absolute left-0 bottom-0 -top-16 w-px bg-gradient-to-b from-zinc-600/0 via-zinc-600 to-zinc-600/0" />
      <Search className="shrink-0 w-52 ml-4 mb-9" />
      <ul className="relative grow overflow-y-auto">
        {elements.map((element, index) => (
          <NavigationLink key={index} level={0} element={element} />
        ))}
      </ul>
    </aside>
  )
}
