"use client"

import React from "react"
import { Tutorial } from "contentlayer/generated"
import { groupedTutorials } from "@/workspaces/domain/tutorial"
import { Accordion } from "@/components/ui/accordion"
import { MenuGroup } from "./MenuGroup"

export declare namespace Menu {
  export interface Props {
    readonly selected: Tutorial
    readonly groupedTutorials: typeof groupedTutorials
  }
}

export const Menu: React.FC<Menu.Props> = ({
  selected,
  groupedTutorials
}) => {
  const defaultValue = Object.values(groupedTutorials).find((tutorials) =>
    tutorials.children.some((tutorial) => tutorial._id === selected._id)
  )
  return (
    <Accordion
      type="single"
      className="w-full"
      defaultValue={defaultValue?.index._id}
      collapsible
    >
      {Object.entries(groupedTutorials).map(([slug, tutorials]) => (
        <MenuGroup key={slug} group={tutorials} selected={selected} />
      ))}
    </Accordion>
  )
}
