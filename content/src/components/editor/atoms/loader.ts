import { Result, Atom } from "@effect-atom/atom-react"
import * as Effect from "effect/Effect"
import { Loader } from "../services/loader"

const runtime = Atom.runtime(Loader.Default)

export const isLoadedAtom = runtime
  .atom(Loader.pipe(Effect.flatMap((loader) => loader.await)))
  .pipe(Atom.map(Result.isSuccess))
