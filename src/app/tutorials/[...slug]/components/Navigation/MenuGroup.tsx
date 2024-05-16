"use client"

import { TutorialGroup } from "@/app/tutorials/grouped"
import { Icon } from "@/components/icons"
import clsx from "clsx"
import { Tutorial } from "contentlayer/generated"
import Link from "next/link"
import { useCallback, useState } from "react"

export function MenuGroup({
  group,
  selected
}: {
  readonly group: TutorialGroup
  readonly selected: Tutorial
}) {
  const [expanded, setExpanded] = useState(() =>
    group.children.some((tutorial) => tutorial._id === selected._id)
  )
  const onClick = useCallback(
    () => setExpanded((prev) => !prev),
    [setExpanded]
  )
  return (
    <div onClick={onClick}>
      <h4 className="font-display text-base flex items-center pb-1">
        <span className="pr-2">
          <Icon
            name="chevron-right"
            className={clsx(
              "h-3 leading-none transition-transform",
              expanded ? "rotate-90" : "rotate-0"
            )}
          />
        </span>
        {group.index.section}
      </h4>
      <div
        className={clsx(
          "pl-4 leading-loose text-sm",
          expanded ? "" : "hidden"
        )}
      >
        {group.children.map((tutorial) => (
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
  )
}
