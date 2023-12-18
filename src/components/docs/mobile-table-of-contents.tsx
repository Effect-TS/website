"use client"

import { getNodeText, sluggifyTitle } from "@/contentlayer/utils/sluggify"
import Link from "next/link"
import { FC, useEffect, useState } from "react"
import { Icon } from "../icons"
import { Divider } from "../layout/divider"

export const MobileTableOfContents: FC<{
  elements: { level: number; title: string }[]
  pageFilePath?: string
  pageTitle?: string
}> = ({ elements, pageFilePath, pageTitle }) => {
  const [activeHeading, setActiveHeading] = useState("")
  const [showScrollToTopButton, setShowScrollToTopButton] =
    useState<boolean>(false)

  const scrollTo = (slug: string) => {
    const element = document.getElementById(slug)
    window.scrollTo({
      top: element!.getBoundingClientRect().top + window.scrollY - 128,
      behavior: "smooth"
    })
  }

  return (
    <div className="toc xl:hidden">
      {elements.length > 1 && (
        <details className="open:bg-zinc-100 dark:open:bg-zinc-900 rounded-xl p-2 sm:p-4 pb-0 pt-4 open:pb-2 open:pl-4 open:p-4 mt-8 -mx-2 sm:-mx-4">
          <summary className="list-none flex gap-2 items-center mb-4">
            <h2 className="text-black dark:text-white uppercase text-sm font-semibold">
              On this page
            </h2>
            <Icon
              name="chevron-right"
              className="h-3 rotate-90 text-black dark:text-white -mt-0.5"
            />
          </summary>
          <ul className="relative grow overflow-y-auto text-sm">
            {elements
              .slice(1, elements.length)
              .map(({ level, title }, index) => {
                const slug = sluggifyTitle(getNodeText(title))
                return (
                  <li
                    key={index}
                    className="mt-1"
                    style={{ paddingLeft: `${level > 1 ? level - 2 : 0}rem` }}
                  >
                    <button
                      onClick={() => scrollTo(slug)}
                      className={`flex items-center pb-1 hover:text-black dark:hover:text-white leading-snug text-left ${
                        slug === activeHeading
                          ? "text-black font-normal dark:text-white dark:font-light"
                          : ""
                      }`}
                      dangerouslySetInnerHTML={{
                        __html: title
                          .replace("`", "<code>")
                          .replace("`", "</code>")
                      }}
                    />
                  </li>
                )
              })}
          </ul>
        </details>
      )}
    </div>
  )
}
