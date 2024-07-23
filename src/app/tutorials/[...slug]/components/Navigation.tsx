"use server"

import React from "react"
import Link from "next/link"
import { Icon } from "@/components/icons"
import { Tutorial } from "contentlayer/generated"
import { cn } from "@/lib/utils"
import {
  groupedTutorials,
  tutorialSection
} from "@/workspaces/domain/tutorial"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"

export declare namespace Navigation {
  export interface Props {
    readonly tutorial: Tutorial
  }
}

export const Navigation: React.FC<Navigation.Props> = async ({
  tutorial
}) => {
  const group = groupedTutorials[tutorialSection(tutorial)]
  const index = group.children.indexOf(tutorial)
  const previous = group.children[index - 1]
  const next = group.children[index + 1]

  return (
    <div className="px-4 pb-4 flex items-center">
      <PrevPage href={previous?.urlPath} />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex-1 p-px bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-600 dark:to-zinc-900 rounded-lg cursor-pointer">
            <nav className="px-4 py-2 bg-gray-100 dark:bg-neutral-900 rounded-lg">
              <div className="flex items-center">
                <strong className="font-medium">{group.index.section}</strong>
                <span className="text-lg px-2 leading-none">/</span>
                <span>{tutorial.title}</span>
                <div className="flex-1" aria-hidden />
                <Icon name="arrows-up-down" className="h-4" />
              </div>
            </nav>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] p-px bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-600 dark:to-zinc-900 rounded-lg">
          <div className="p-4 bg-gray-100 dark:bg-neutral-900 rounded-lg">
            {group.children.map((child) => (
              <NavigationItem
                key={child._id}
                selected={tutorial._id === child._id}
                tutorial={child}
              />
            ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <NextPage href={next?.urlPath} />
    </div>
  )
}

function NavigationItem({
  selected,
  tutorial
}: {
  readonly selected: boolean
  readonly tutorial: Tutorial
}) {
  return (
    <DropdownMenuItem disabled={selected} className="text-md" asChild>
      {selected ? (
        <div className="flex gap-2 font-medium !opacity-100">
          <Icon name="arrow-right" className="h-4 w-4" />
          <span>{tutorial.title}</span>
        </div>
      ) : (
        <Link
          href={tutorial.urlPath}
          className={cn("cursor-pointer", selected && "font-medium")}
        >
          {tutorial.title}
        </Link>
      )}
    </DropdownMenuItem>
  )
}

function NextPage({ href }: { readonly href: string | undefined }) {
  return (
    <Link
      href={href ?? "#"}
      className={cn("h-4 pl-3", !href && "text-gray-400 dark:text-gray-500")}
    >
      <Icon name="arrow-right" className="h-full" />
    </Link>
  )
}

function PrevPage({ href }: { readonly href: string | undefined }) {
  return (
    <Link
      href={href ?? "#"}
      className={cn("h-4 pr-3", !href && "text-gray-400 dark:text-gray-500")}
    >
      <Icon name="arrow-right" className="h-full rotate-180" />
    </Link>
  )
}
