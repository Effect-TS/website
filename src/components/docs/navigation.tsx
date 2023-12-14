import { DocsPage, allDocsPages } from "contentlayer/generated"
import { Search } from "../atoms/search"
import { NavigationLink } from "./navigation-link"
import { FC } from "react"

const generateDocsNavigation = ({ pages, parents }: { pages: DocsPage[]; parents: string[] }): DocsNavElement[] => {
  const level = parents.length
  return pages
    .filter((page) => page.pathSegments.length === level + 1 && page.urlPath.startsWith(`/docs/${parents.join("/")}`))
    .sort((pageA, pageB) => pageA.pathSegments[level].order - pageB.pathSegments[level].order)
    .map((page) => ({
      title: page.navTitle ?? page.title,
      urlPath: page.urlPath,
      collapsible: page.collapsible ?? false,
      children: generateDocsNavigation({ pages, parents: page.pathSegments.map((segment: PathSegment) => segment.pathName) })
    }))
}

export const Navigation: FC<{ className?: string }> = ({ className = "" }) => {
  const elements = generateDocsNavigation({ pages: allDocsPages, parents: [] })

  return (
    <aside className={`flex-none sticky top-32 sm:top-40 mb-16 flex flex-col w-60 -ml-4 ${className}`}>
      <div className="absolute left-0 bottom-0 -top-16 w-px bg-gradient-to-b from-zinc-300/0 via-zinc-300 to-zinc-300/0 dark:from-zinc-600/0 dark:via-zinc-600 dark:to-zinc-600/0" />
      <Search className="shrink-0 w-56 ml-4" />
      <ul className="relative w-64 grow overflow-y-auto py-9 text-sm">
        {elements.map((element, index) => (
          <NavigationLink key={index} level={0} element={element} />
        ))}
      </ul>
      <div className="absolute left-px top-8 h-9 w-full bg-gradient-to-b from-white dark:from-[#09090B]" />
    </aside>
  )
}
