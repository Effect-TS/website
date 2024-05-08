"use server"

import { Icon } from "@/components/icons"
import { Tutorial, allTutorials } from "contentlayer/generated"
import Link from "next/link"
import { useMemo } from "react"

export async function Navigation({
  tutorial
}: {
  readonly tutorial: Tutorial
}) {
  const index = useMemo(() => allTutorials.indexOf(tutorial), [tutorial])
  const previous = useMemo(() => allTutorials[index - 1], [index])
  const next = useMemo(() => allTutorials[index + 1], [index])

  return (
    <div className="px-4 flex items-center">
      <Link
        href={previous?.urlPath ?? "#"}
        className={`h-4 ${previous ? "" : "text-gray-400"}`}
      >
        <Icon name="arrow-right" className="h-full rotate-180" />
      </Link>
      <nav className="bg-gray-100 dark:bg-gray-900 dark:border-gray-600 p-2 rounded border flex-1 mx-2 flex items-center cursor-pointer">
        <strong className="font-medium">{tutorial.section}</strong>
        <Separator />
        <span>{tutorial.title}</span>
        <div className="flex-1" aria-hidden />
        <Icon name="chevron-right" className="h-4 rotate-90" />
      </nav>
      <Link
        href={next?.urlPath ?? "#"}
        className={`h-4 ${next ? "" : "text-gray-400"}`}
      >
        <Icon name="arrow-right" className="h-full" />
      </Link>
    </div>
  )
}

function Separator() {
  return <span className="text-lg px-2 leading-none">/</span>
}
