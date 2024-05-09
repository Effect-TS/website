"use client"

import { Icon } from "@/components/icons"
import { useClickOutside } from "@/hooks/useClickOutside"
import { Tutorial } from "contentlayer/generated"
import { NonEmptyArray } from "effect/Array"
import Link from "next/link"
import { useCallback, useRef, useState } from "react"

export function MenuButton({
  tutorial,
  grouped
}: {
  readonly tutorial: Tutorial
  readonly grouped: Record<string, NonEmptyArray<Tutorial>>
}) {
  const [visible, setVisible] = useState(false)

  const onClick = useCallback(
    function () {
      setVisible((_) => !_)
    },
    [setVisible]
  )

  const ref = useRef<HTMLElement>(null)
  useClickOutside(ref, function () {
    setVisible(false)
  })

  return (
    <nav
      ref={ref}
      className="bg-gray-100 dark:bg-neutral-900 dark:border-neutral-600 p-2 rounded border flex-1 mx-2 flex items-center cursor-pointer relative"
      onClick={onClick}
    >
      <strong className="font-medium">{tutorial.section}</strong>
      <Separator />
      <span>{tutorial.title}</span>
      <div className="flex-1" aria-hidden />
      <Icon name="chevron-right" className="h-4 rotate-90" />
      <Menu grouped={grouped} selected={tutorial} visible={visible} />
    </nav>
  )
}

function Separator() {
  return <span className="text-lg px-2 leading-none">/</span>
}

function Menu({
  selected,
  grouped,
  visible
}: {
  readonly selected: Tutorial
  readonly grouped: Record<string, NonEmptyArray<Tutorial>>
  readonly visible: boolean
}) {
  return (
    <div
      className={`absolute transition-all bg-white dark:bg-neutral-800 z-10 p-4 rounded-xl shadow-2xl border dark:border-neutral-700 leading-loose top-0 left-0 w-full mt-12 ${
        visible ? "visible opacity-100" : "invisible opacity-0"
      } max-h-96 overflow-y-auto`}
    >
      {Object.entries(grouped).map(([slug, tutorials]) => (
        <div key={slug}>
          <h4 className="font-medium">{tutorials[0].section}</h4>
          <div className="pl-4">
            {tutorials.map((tutorial) => (
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
