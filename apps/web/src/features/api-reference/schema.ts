import { ApiReferenceEntry } from "@website/domain/ApiReference"
import { z } from "astro/zod"
import * as Schema from "effect/Schema"

export * from "@website/domain/ApiReference"

export const ApiReferenceContentEntry = z.custom<typeof ApiReferenceEntry.Type>(
  Schema.is(ApiReferenceEntry),
)
