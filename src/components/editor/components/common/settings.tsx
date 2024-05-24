"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Icon } from "@/components/icons"
import { FormatterSettings } from "./settings/formatter-settings"

export declare namespace Settings {
  export interface Props {}
}

export const Settings: React.FC<Settings.Props> = ({}) => {
  const [open, setIsOpen] = React.useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary">
            <span className="sr-only">Playground Settings</span>
            <Icon name="gear" className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Playground Settings</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onSelect={() => setIsOpen(true)}>
              <Icon name="wand" className="h-4 w-4 mr-2" />
              <span>Formatter</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <FormatterSettings open={open} onOpenChange={setIsOpen} />
    </>
  )
}

Settings.displayName = "Settings"
