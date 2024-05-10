"use server"

import { groupedTutorials } from "@/app/tutorials/grouped"
import { Tutorial } from "contentlayer/generated"
import Link from "next/link"

export async function Menu({ selected }: { readonly selected: Tutorial }) {
  return (
    <div
      className={`bg-white dark:bg-neutral-800 p-4 rounded-xl shadow-2xl border dark:border-neutral-700 leading-loose w-full max-h-96 overflow-y-auto`}
    >
      {Object.entries(groupedTutorials).map(([slug, tutorials]) => (
        <div key={slug}>
          <h4 className="font-medium">{tutorials.index.section}</h4>
          <div className="pl-4">
            {tutorials.children.map((tutorial) => (
              <div key={tutorial._id}>
                <Link
                  href={tutorial.urlPath}
                  className={`hover:underline ${
                    tutorial._id === selected._id ? "font-medium" : ""
                  }`}
                >
                  {tutorial.title}
                </Link>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
