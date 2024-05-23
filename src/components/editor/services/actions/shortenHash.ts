"use server"

import { effectAction } from "@/lib/actions"
import { Shorten } from "@/services/Shorten"
import { Effect, Option } from "effect"

export const shortenHash = (hash: string) =>
  effectAction(
    Effect.gen(function* (_) {
      const shorten = yield* Shorten
      return yield* shorten.generate(hash)
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
