"use server"

import * as Effect from "effect/Effect"
import Sqids from "sqids"

const sqids = new Sqids({
  minLength: 10
})

export async function shortenUrl(url: string) {
  return Effect.gen(function*() {
    return sqids.encode(url.split("").map((c) => c.codePointAt(0)!))
  }).pipe(Effect.runPromise)
}