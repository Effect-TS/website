"use client"

import { useCallback } from "react"
import type { Tutorial } from "contentlayer/generated"
import type { CheckedState } from "@radix-ui/react-checkbox"
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

export type Difficulty = Tutorial["difficulty"]

const levels: ReadonlyArray<{
  readonly id: Difficulty
  readonly label: string
}> = [
  { id: "beginner", label: "Beginner" },
  { id: "intermediate", label: "Intermediate" },
  { id: "advanced", label: "Advanced" }
]

export function DifficultySelector({
  onSelect,
  onUnselect
}: {
  readonly onSelect?: (choice: Difficulty) => void
  readonly onUnselect?: (choice: Difficulty) => void
}) {
  const handleCheckedChange = useCallback(
    (checked: CheckedState, difficulty: Difficulty) => {
      if (checked) {
        onSelect?.(difficulty)
      } else {
        onUnselect?.(difficulty)
      }
    },
    [onSelect, onUnselect]
  )

  return (
    <AccordionItem value="difficulty">
      <AccordionTrigger className="text-base font-semibold">
        Difficulty
      </AccordionTrigger>
      <AccordionContent>
        <div className="grid gap-2 ml-4">
          {levels.map((choice) => (
            <Label
              key={choice.id}
              className="flex items-center gap-2 font-normal"
            >
              <Checkbox
                id={choice.id}
                onCheckedChange={(checked) =>
                  handleCheckedChange(checked, choice.id)
                }
              />
              {choice.label}
            </Label>
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}
