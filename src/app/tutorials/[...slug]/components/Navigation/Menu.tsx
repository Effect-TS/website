"use server"

import { groupedTutorials } from "@/app/tutorials/grouped"
import { Tutorial } from "contentlayer/generated"
import { MenuGroup } from "./MenuGroup"

export async function Menu({ selected }: { readonly selected: Tutorial }) {
  return (
    <div
      className={`bg-white dark:bg-neutral-800 p-4 rounded-xl shadow-2xl border dark:border-neutral-700 w-full max-h-96 overflow-y-auto flex flex-col gap-2`}
    >
      {Object.entries(groupedTutorials).map(([slug, tutorials]) => (
        <MenuGroup key={slug} group={tutorials} selected={selected} />
      ))}
    </div>
  )
}
