"use server"

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
    <div className="px-4">
      {previous && <Link href={previous.urlPath}>Prev</Link>}
      <nav className="bg-gray-100 dark:bg-gray-900 dark:border-gray-600 p-2 rounded border">
        <strong className="font-medium">{tutorial.section}</strong>
        <Separator />
        <span>{tutorial.title}</span>
      </nav>
      {next && <Link href={next.urlPath}>Next</Link>}
    </div>
  )
}

function Separator() {
  return <span className="text-lg p-2">/</span>
}
