"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { FC, useEffect, useRef, useState } from "react"
import { Icon } from "../icons"

export const NavigationLink: FC<{
  level: number
  element: DocsNavElement
}> = ({ level, element }) => {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState<boolean>(
    element.collapsible
      ? pathname.startsWith(element.urlPath)
        ? false
        : true
      : false
  )
  const ref = useRef<HTMLLIElement>(null)

  useEffect(() => {
    if (pathname.startsWith(element.urlPath)) {
      setCollapsed(false)
    }
    if (
      level === 0 &&
      element.children.length > 0 &&
      pathname.startsWith(element.urlPath)
    ) {
      console.log(ref.current?.offsetTop)
      document
        .getElementById("docs-sidebar-navigation")
        ?.scrollTo({ top: ref.current!.offsetTop - 32, behavior: "smooth" })
    }
  }, [element, pathname])

  return (
    <li ref={ref}>
      <Link
        href={element.urlPath}
        className={`leading-tight flex items-center w-full justify-between px-4 border-l ${
          element.urlPath === pathname
            ? "border-black dark:border-white text-black font-normal dark:text-white dark:font-light"
            : "border-transparent text-zinc-700 dark:text-zinc-400"
        } ${
          level === 0 && element.children.length
            ? "text-black dark:text-white uppercase text-sm font-semibold mt-12"
            : "mt-3"
        }`}
        style={{ minHeight: "1.25rem" }}
      >
        <span
          className={`${
            level === 0 && element.children.length
              ? "text-black dark:text-white"
              : ""
          }`}
          style={{ marginLeft: `${level > 0 ? level - 1 : 0}rem` }}
        >
          {element.title}
        </span>
        {element.children.length > 0 && element.collapsible && (
          <button
            className="h-5 w-5 flex items-center justify-center"
            onClick={(e) => {
              e.preventDefault()
              setCollapsed((collapsed) => !collapsed)
            }}
          >
            <Icon
              name="chevron-right"
              className={`h-3 -mt-0.5 transition-transform duration-200 ${
                collapsed ? "rotate-0" : "rotate-90"
              }`}
            />
          </button>
        )}
      </Link>
      {element.children && !collapsed && (
        <ul>
          {element.children.map((child, index) => (
            <NavigationLink key={index} level={level + 1} element={child} />
          ))}
        </ul>
      )}
    </li>
  )
}
