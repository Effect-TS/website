import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as ManagedRuntime from "effect/ManagedRuntime"
import * as Option from "effect/Option"
import * as AstroContent from "./astro-content"
import type { ModuleContentError, ModuleNotFound } from "./domain"
import { Modules } from "./service"

const runtime = ManagedRuntime.make(
  Modules.layer.pipe(Layer.provide(AstroContent.layer)),
)

const run = <A>(
  effect: Effect.Effect<A, ModuleContentError | ModuleNotFound, Modules>,
): Promise<A> => runtime.runPromise(effect)

/** Modules in publication order, numbered from 1. */
export const getModules = () =>
  run(
    Effect.gen(function* () {
      return yield* (yield* Modules).modules
    }),
  )

export const getLatestModules = () =>
  run(
    Effect.gen(function* () {
      return yield* (yield* Modules).latest
    }),
  )

/** The series' introduction post, or `undefined` if there is none. */
export const getIntro = () =>
  run(
    Effect.gen(function* () {
      return Option.getOrUndefined(yield* (yield* Modules).intro)
    }),
  )

/** Finds a module by number or post id. Rejects with `ModuleNotFound`. */
export const getModule = (ref: number | string) =>
  run(
    Effect.gen(function* () {
      return yield* (yield* Modules).module(ref)
    }),
  )
