"use server"

import React from "react"
import Link from "next/link"
import { Icon } from "@/components/icons"
import { Tutorial } from "contentlayer/generated"
import { Menu } from "./Navigation/Menu"
import { MenuButton } from "./Navigation/MenuButton"
import { cn } from "@/lib/utils"
import { groupedTutorials, tutorialSection } from "@/workspaces/domain/tutorial"

export declare namespace Navigation {
  export interface Props {
    readonly tutorial: Tutorial
  }
}

export const Navigation: React.FC<Navigation.Props> = async ({ tutorial }) => {
  const group = groupedTutorials[tutorialSection(tutorial)]
  const index = group.children.indexOf(tutorial)
  const previous = group.children[index - 1]
  const next = group.children[index + 1]

  return (
    <div className="px-4 pb-4 flex items-center">
      <PrevPage href={previous?.urlPath} />

      <MenuButton title={tutorial.title} section={group.index.section!}>
        <Menu selected={tutorial} groupedTutorials={groupedTutorials} />
      </MenuButton>

      <NextPage href={next?.urlPath} />
    </div>
  )
}

declare namespace NextPage {
  export interface Props {
    readonly href: string | undefined
  }
}

const NextPage: React.FC<NextPage.Props> = ({ href }) => (
  <Link
    href={href ?? "#"}
    className={cn("h-4 pl-3", !href && "text-gray-400 dark:text-gray-500")}
  >
    <Icon name="arrow-right" className="h-full" />
  </Link>
)

declare namespace PrevPage {
  export interface Props {
    readonly href: string | undefined
  }
}

const PrevPage: React.FC<NextPage.Props> = ({ href }) => (
  <Link
    href={href ?? "#"}
    className={cn("h-4 pr-3", !href && "text-gray-400 dark:text-gray-500")}
  >
    <Icon name="arrow-right" className="h-full rotate-180" />
  </Link>
)
