import { z } from "astro/zod"

const page = {
  /**
   * The course part, 1 to 4.
   */
  part: z.int().min(1).max(4),
  /**
   * The lesson number, counted across the whole course.
   */
  order: z.int().positive(),
  /**
   * The lesson title.
   */
  title: z.string().min(1),
}

const lesson = {
  ...page,
  /**
   * The lesson's share of the course time budget, in minutes.
   */
  minutes: z.int().positive(),
}

export const LearnEntry = z.discriminatedUnion("mode", [
  z.object({
    ...lesson,
    /**
     * Runs beside the playground with the lesson's pinned workspace.
     */
    mode: z.literal("playground"),
    /**
     * The lesson directory under `courses/rulebook/lessons/part1/`.
     */
    lessonDir: z.string().min(1),
  }),
  z.object({
    ...lesson,
    /**
     * Runs on the learner's machine from the starter.
     */
    mode: z.literal("local"),
    lessonDir: z.string().min(1).optional(),
  }),
  z.object({
    ...page,
    /**
     * A page between lessons, such as setup, rather than a numbered lesson.
     * It comes just before the lesson with the same `order`.
     */
    mode: z.literal("guide"),
    /**
     * Set when the page is counted in the course time budget.
     */
    minutes: z.int().positive().optional(),
  }),
])

export type LearnEntry = z.infer<typeof LearnEntry>
