"use server"

import { Icon } from "@/components/icons"
import { Tutorial, allTutorials } from "contentlayer/generated"
import { Array } from "effect"
import Link from "next/link"
import { useMemo } from "react"
import { MenuButton } from "./Navigation/MenuButton"

const groupedTutorials = Array.groupBy(
  allTutorials,
  (_) => _.urlPath.replace("/tutorials/", "").split("/")[0]
)

export async function Navigation({
  tutorial
}: {
  readonly tutorial: Tutorial
}) {
  const index = useMemo(() => allTutorials.indexOf(tutorial), [tutorial])
  const previous = useMemo(() => allTutorials[index - 1], [index])
  const next = useMemo(() => allTutorials[index + 1], [index])

  return (
    <>
      <div className="px-4 flex items-center">
        <Link
          href={previous?.urlPath ?? "#"}
          className={`h-4 ${
            previous ? "" : "text-gray-400 dark:text-gray-500"
          }`}
        >
          <Icon name="arrow-right" className="h-full rotate-180" />
        </Link>
        <MenuButton grouped={groupedTutorials} tutorial={tutorial} />
        <Link
          href={next?.urlPath ?? "#"}
          className={`h-4 ${next ? "" : "text-gray-400 dark:text-gray-500"}`}
        >
          <Icon name="arrow-right" className="h-full" />
        </Link>
      </div>
    </>
  )
}
