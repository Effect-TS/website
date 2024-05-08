"use server"

import { Tutorial } from "contentlayer/generated"

export async function Navigation({
  slug,
  tutorial
}: {
  readonly slug: ReadonlyArray<string>
  readonly tutorial: Tutorial
}) {
  return (
    <div className="px-4">
      <nav className="bg-white p-2 rounded border">
        <strong className="font-medium">{tutorial.section}</strong>
        <Seperator />
        <span>{tutorial.title}</span>
      </nav>
    </div>
  )
}

function Seperator() {
  return <span className="text-lg p-2">/</span>
}
