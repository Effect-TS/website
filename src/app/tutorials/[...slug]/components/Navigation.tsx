"use server"

import { Icon } from "@/components/icons"
import { Tutorial, allTutorials } from "contentlayer/generated"
import Link from "next/link"
import { useMemo } from "react"
import { MenuButton } from "./Navigation/MenuButton"
import { DeepMutable } from "effect/Types"
import { Menu } from "./Navigation/Menu"
import { groupedTutorials, tutorialSection } from "../../grouped"

export async function Navigation({
  tutorial
}: {
  readonly tutorial: Tutorial
}) {
  const group = groupedTutorials[tutorialSection(tutorial)]
  const index = group.children.indexOf(tutorial)
  const previous = group.children[index - 1]
  const next = group.children[index + 1]

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
        <MenuButton title={tutorial.title} section={group.index.section!}>
          <Menu selected={tutorial} />
        </MenuButton>
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
