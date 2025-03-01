import { z } from "astro:content"

export const tutorialSchema = z.object({
  /**
   * Required at the moment to differentiate a tutorial schema from others.
   */
  type: z.literal("Tutorial"),
  /**
   * The list of tags associated with the tutorial.
   */
  tags: z.array(z.string())
})

export type Tutorial = z.TypeOf<typeof tutorialSchema>
