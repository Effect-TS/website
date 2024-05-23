"use client"

import { Icon } from "@/components/icons"
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover"

export declare namespace MenuButton {
  export type Props = React.PropsWithChildren<{
    readonly section: string
    readonly title: string
  }>
}

export const MenuButton: React.FC<MenuButton.Props> = ({
  children,
  section,
  title
}) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex-1 p-px bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-600 dark:to-zinc-900 rounded-lg cursor-pointer">
          <nav className="px-4 py-2 bg-gray-100 dark:bg-neutral-900 rounded-lg">
            <div className="flex items-center">
              <strong className="font-medium">{section}</strong>
              <span className="text-lg px-2 leading-none">/</span>
              <span>{title}</span>
              <div className="flex-1" aria-hidden />
              <Icon name="arrows-up-down" className="h-4" />
            </div>
          </nav>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width]">{children}</PopoverContent>
    </Popover>
  )
}
