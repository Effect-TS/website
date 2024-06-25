"use client"

import { useReducer } from "react"
import { Data } from "effect"
import type { Tutorial } from "contentlayer/generated"
import { Accordion } from "@/components/ui/accordion"
import {
  Card,
  CardHeader,
  CardDescription,
  CardContent,
  CardFooter,
  CardTitle
} from "@/components/ui/card"
import { Icon } from "@/components/icons"
import { groupedTutorials, TutorialGroup } from "@/workspaces/domain/tutorial"
import { DifficultySelector } from "./DifficultySelector"

export type Difficulty = Tutorial["difficulty"]

interface State {
  readonly difficulties: ReadonlyArray<Difficulty>
}

type Action = Data.TaggedEnum<{
  readonly SelectDifficulty: { readonly difficulty: Difficulty }
  readonly UnselectDifficulty: { readonly difficulty: Difficulty }
}>
const Action = Data.taggedEnum<Action>()

const initialState: State = {
  difficulties: []
}

function reducer(state: State, action: Action): State {
  switch (action._tag) {
    case "SelectDifficulty":
      return {
        ...state,
        difficulties: [...state.difficulties, action.difficulty]
      }
    case "UnselectDifficulty":
      return {
        ...state,
        difficulties: state.difficulties.filter(
          (value) => value !== action.difficulty
        )
      }
  }
}

function applyDifficultyFilter(
  tutorials: ReadonlyArray<TutorialGroup>,
  difficulties: ReadonlyArray<Difficulty>
): ReadonlyArray<TutorialGroup> {
  if (difficulties.length === 0) {
    return tutorials
  }
  return tutorials.filter(({ index }) =>
    difficulties.includes(index.difficulty)
  )
}

export function TutorialsDisplay() {
  const [state, dispatch] = useReducer(reducer, initialState)

  const groups = Object.values(groupedTutorials)
  const byDifficulty = applyDifficultyFilter(groups, state.difficulties)
  const tutorials = byDifficulty.map(({ index }) => index)

  return (
    <div className="container px-4 md:px-6 grid grid-cols-1 md:grid-cols-[128px_1fr] gap-10 items-start py-12 md:py-20">
      <div className="flex flex-col gap-6">
        <Accordion type="multiple" className="w-full">
          <DifficultySelector
            onSelect={(difficulty) =>
              dispatch(Action.SelectDifficulty({ difficulty }))
            }
            onUnselect={(difficulty) =>
              dispatch(Action.UnselectDifficulty({ difficulty }))
            }
          />
        </Accordion>
      </div>

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {tutorials.map(
          ({ _id, urlPath, section, excerpt, prerequisites }) => (
            <a key={_id} href={urlPath} target="_blank">
              <Card className="h-full flex flex-col bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-800 dark:to-zinc-900 cursor-pointer generic-hover">
                <CardHeader className="pb-2">
                  <CardTitle className="font-display text-2xl">
                    {section}
                  </CardTitle>
                  <CardDescription className="text-black dark:text-white font-normal dark:font-light">
                    {excerpt}
                  </CardDescription>
                </CardHeader>
                <CardContent className="grow">
                  <h4 className="text-lg font-display font-semibold">
                    Pre-requisites:
                  </h4>
                  <ul className="pl-5 space-y-1 text-sm font-normal dark:font-light text-black dark:text-white list-disc">
                    {(prerequisites ?? []).map((requirement) => (
                      <li key={requirement}>{requirement}</li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <p className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 dark:bg-gray-50 text-sm font-medium text-gray-50 dark:text-gray-900 rounded-md shadow">
                    <span>Begin Tutorial</span>
                    <Icon name="arrow-right" className="h-4" />
                  </p>
                </CardFooter>
              </Card>
            </a>
          )
        )}
        {/* TODO: remove, only here for UI testing */}
        <a href="#" target="_blank">
          <Card className="h-full flex flex-col bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-800 dark:to-zinc-900 cursor-pointer generic-hover">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-2xl">
                Lorem Ipsum
              </CardTitle>
              <CardDescription className="text-black dark:text-white font-normal dark:font-light">
                nisl tincidunt eget nullam non nisi est sit amet facilisis
              </CardDescription>
            </CardHeader>
            <CardContent className="grow">
              <h4 className="text-lg font-display font-semibold">
                Pre-requisites:
              </h4>
              <ul className="pl-5 space-y-1 text-sm font-normal dark:font-light text-black dark:text-white list-disc">
                <li>adipiscing at in tellus integer</li>
                <li>adipiscing at in tellus integer</li>
                <li>adipiscing at in tellus integer</li>
              </ul>
            </CardContent>
            <CardFooter>
              <p className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 dark:bg-gray-50 text-sm font-medium text-gray-50 dark:text-gray-900 rounded-md shadow">
                <span>Begin Tutorial</span>
                <Icon name="arrow-right" className="h-4" />
              </p>
            </CardFooter>
          </Card>
        </a>
      </div>
    </div>
  )
}
