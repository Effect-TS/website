import { Tutorial, allTutorials } from "contentlayer/generated"
import type { DeepMutable } from "effect/Types"

export type GroupedTutorials = Record<
  string,
  {
    readonly path: string
    readonly index: Tutorial
    readonly children: ReadonlyArray<Tutorial>
  }
>

export const tutorialSection = (tutorial: Tutorial) =>
  tutorial.urlPath.replace("/tutorials/", "").split("/")[0]

export const groupedTutorials = (function () {
  const grouped: DeepMutable<GroupedTutorials> = {}
  const len = allTutorials.length
  for (let i = 0; i < len; i++) {
    const page = allTutorials[i]
    const path = tutorialSection(page)
    const group = (grouped[path] = grouped[path] ?? {
      path,
      index: undefined as any,
      children: []
    })
    if (page._raw.sourceFileName === "index.mdx") {
      group.index = page
      group.children.unshift(page)
    } else {
      group.children.push(page)
    }
  }
  for (const key in grouped) {
    grouped[key].children.sort((a, b) => a.order - b.order)
  }
  return grouped
})()

export type TutorialGroup = (typeof groupedTutorials)[string]
