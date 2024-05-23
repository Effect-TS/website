"use server"

import { effectAction } from "@/lib/actions"
import { Shorten } from "@/services/Shorten"
import { Effect, Option } from "effect"

export const shortenHash = (value: string) =>
  effectAction(
    Effect.gen(function* (_) {
      const shorten = yield* Shorten
      return yield* shorten.shorten(value)
    })
  )

export const retrieveCompressed = (hash: string) =>
  effectAction(
    Effect.gen(function* (_) {
      const shorten = yield* Shorten
      const o = yield* shorten.retrieve(hash)
      return Option.getOrNull(o)
    })
  )
