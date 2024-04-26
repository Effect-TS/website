"use client"

import { FC, Fragment, useEffect, useState } from "react"
import { Icon } from "../icons"
import algoliasearch from "algoliasearch/lite"
import {
  Highlight,
  InstantSearch,
  SearchBox,
  Snippet,
  useHits
} from "react-instantsearch"
import Link from "next/link"
import { usePathname } from "next/navigation"

const searchClient = algoliasearch(
  "BB6ZVASVH8",
  process.env.NEXT_PUBLIC_ALGOLIA_API_KEY!
)

export const Search: FC<{ className?: string }> = ({ className = "" }) => {
  const [open, setOpen] = useState<boolean>(false)
  const pathname = usePathname()

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
      if (e.key === "k" && (e.ctrlKey || e.metaKey)) setOpen(true)
    }
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [])

  useEffect(() => {
    if (open) {
      document.body.classList.add("no-scroll")
      setTimeout(
        //@ts-ignore
        () => document.querySelector(".ais-SearchBox-input")?.focus(),
        100
      )
    } else {
      document.body.classList.remove("no-scroll")
    }
  }, [open])

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`h-8 bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-600 dark:to-zinc-900 rounded-lg p-px focus:outline-none ${className}`}
      >
        <div className="flex items-center gap-2 pr-1 pl-3 bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-800 dark:to-zinc-950 h-full rounded-[7px]">
          <Icon
            name="search"
            className="h-4 shrink-0 text-black dark:text-white"
          />
          <div className="grow text-left">Search Docs...</div>
          <div className="shrink-0 p-px bg-gradient-to-b from-zinc-300 to-zinc-400 dark:from-zinc-400 dark:to-zinc-600 rounded">
            <div className="bg-zinc-200 dark:bg-zinc-700 text-xs text-black dark:text-white px-1 py-0.5 rounded-[3px]">
              ⌘K
            </div>
          </div>
        </div>
      </button>
      {open && (
        <div className="fixed left-0 top-0 w-screen h-screen z-50 bg-white/70 dark:bg-[#09090B]/70 backdrop-blur px-4 sm:px-8">
          <div className="absolute inset-0" onClick={() => setOpen(false)} />
          <div
            className="relative mt-24 w-full max-w-3xl mx-auto bg-gradient-to-br from-zinc-200 to-zinc-200 dark:from-zinc-600 dark:to-zinc-900 p-px rounded-xl"
            style={{ height: "calc(100vh - 12rem)", maxHeight: "32rem" }}
          >
            <div className="h-full w-full bg-zinc-50 dark:bg-zinc-900 flex flex-col rounded-[11px] overflow-hidden">
              <InstantSearch
                searchClient={searchClient}
                indexName="effect-docs"
              >
                <div className="flex items-center p-4 border-b border-zinc-200 dark:border-zinc-800">
                  <Icon name="search" className="shrink-0 h-4" />
                  <SearchBox placeholder="Search Docs..." />
                  <div className="shrink-0 p-px bg-gradient-to-b from-zinc-300 to-zinc-400 dark:from-zinc-400 dark:to-zinc-600 rounded">
                    <div className="bg-zinc-200 dark:bg-zinc-700 text-xs text-black dark:text-white px-1 py-0.5 rounded-[3px]">
                      ESC
                    </div>
                  </div>
                </div>
                <div className="overflow-y-scroll grow p-4 pt-0">
                  <Hits />
                </div>
                <div className="flex gap-2 items-center px-4 py-2 border-t border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 text-sm">
                  <Icon name="algolia" className="h-3.5" />
                  <span>
                    Search powered by{" "}
                    <Link
                      href="https://www.algolia.com/"
                      className="underline"
                    >
                      Algolia
                    </Link>
                    .
                  </span>
                </div>
              </InstantSearch>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const Hits = (props: any) => {
  const { hits } = useHits(props)
  let chapter = ""
  return (
    <ul className="-mt-4">
      {hits.map((hit, index) => {
        const showChapter = hit.chapter !== chapter
        chapter = hit.chapter as string

        return (
          <Fragment key={index}>
            {showChapter && (
              <div className="mt-8 mb-4 text-lg font-semibold text-black dark:text-white">
                {chapter}
              </div>
            )}
            <Link
              href={hit.urlPath as string}
              className="flex items-center justify-between gap-4 p-4 pt-3 pb-3.5 mt-2 rounded-lg border-2 border-transparent bg-zinc-100 dark:bg-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 focus:outline-none focus:border-zinc-300 dark:focus:border-zinc-700"
            >
              <div>
                <div>
                  <Highlight
                    attribute="title"
                    hit={hit}
                    className="font-normal text-black dark:font-light dark:text-white"
                  />
                </div>
                <div className="!leading-none !mt-1">
                  <Snippet
                    hit={hit}
                    attribute="content"
                    className="text-sm text-zinc-700 dark:text-zinc-400 line-clamp-1"
                  />
                </div>
              </div>
              <Icon
                name="chevron-right"
                className="h-3.5 text-zinc-400 dark:text-zinc-600 shrink-0"
              />
            </Link>
          </Fragment>
        )
      })}
    </ul>
  )
}
