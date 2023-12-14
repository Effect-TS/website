import { allDocsPages } from "contentlayer/generated"
import Link from "next/link"
import { FC } from "react"
import { Icon } from "../icons"

export const Pagination: FC<{ path: string }> = ({ path }) => {
  const currentPage = allDocsPages.find((page) => page.urlPath === path)!
  const length = path.split("/").length
  const parentPath = path
    .split("/")
    .slice(0, length - 1)
    .join("/")
  const pages = allDocsPages
    .filter((page) => page.urlPath.startsWith(parentPath) && page.urlPath.split("/").length === length && page.order > 0)
    .map((page) => ({ title: page.title, urlPath: page.urlPath, order: page.order }))
  const prev = pages.filter((page) => page.order < currentPage.order).sort((pageA, pageB) => pageB.order - pageA.order)[0]
  const next = pages.sort((pageA, pageB) => pageA.order - pageB.order).filter((page) => page.order > currentPage.order)[0]

  return (
    <div className="flex justify-between max-w-[65ch]">
      <div>
        {prev && (
          <Link href={prev.urlPath} className="hover:bg-zinc-100 dark:hover:bg-zinc-900 p-3 -mr-3 -mt-3 block rounded-xl">
            <div className="text-sm flex justify-start gap-1.5 items-center text-zinc-500 dark:text-zinc-400">
              <Icon name="arrow-right" className="h-3 rotate-180" />
              <span>Prev</span>
            </div>
            <div className="text-black dark:text-white">{prev.title}</div>
          </Link>
        )}
      </div>
      <div>
        {next && (
          <Link href={next.urlPath} className="hover:bg-zinc-100 dark:hover:bg-zinc-900 p-3 -mr-3 -mt-3 block rounded-xl">
            <div className="text-sm flex justify-end gap-1.5 items-center text-zinc-500 dark:text-zinc-400">
              <span>Next</span>
              <Icon name="arrow-right" className="h-3" />
            </div>
            <div className="text-black dark:text-white">{next.title}</div>
          </Link>
        )}
      </div>
    </div>
  )
}
