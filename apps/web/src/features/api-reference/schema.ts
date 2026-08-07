import { ApiReferenceEntry } from "@website/mixedbread/ApiReferenceSchema"
import { z } from "astro/zod"
import * as Schema from "effect/Schema"

export * from "@website/mixedbread/ApiReferenceSchema"

export const ApiReferenceContentEntry = z.custom<typeof ApiReferenceEntry.Type>(
  Schema.is(ApiReferenceEntry),
)
