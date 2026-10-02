import * as Effect from "effect/Effect"
import { AsyncResult } from "effect/reactivity"
import { Atom } from "effect/reactivity"
import { Loader } from "../services/loader"

const runtime = Atom.runtime(Loader.layer)

export const isLoadedAtom = runtime
  .atom(Effect.service(Loader).pipe(Effect.flatMap((loader) => loader.await)))
  .pipe(Atom.map(AsyncResult.isSuccess))
