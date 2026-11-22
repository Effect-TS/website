import { Effect } from "effect"

class MyError {
  readonly _tag = "MyError"
}

// 1. floatingEffect
export const floating = Effect.gen(function* () {
  Effect.log("floating")
  return 1
})

// 2. missingStarInYieldEffectGen
export const missingStar = Effect.gen(function* () {
  const n = yield Effect.succeed(1)
  return n
})

// 3. missingReturnYieldStar
export const missingReturn = Effect.gen(function* () {
  const x = yield* Effect.succeed(1)
  if (x > 0) {
    yield* Effect.fail(new MyError())
  }
  return x
})

// 4. unnecessaryEffectGen
export const unnecessary = Effect.gen(function* () {
  return yield* Effect.succeed(42)
})

// 5. tryCatchInEffectGen
export const tryCatch = Effect.gen(function* () {
  try {
    const v = yield* Effect.succeed(1)
    return v
  } catch (e) {
    return 0
  }
})

// 6. plain TS2322
export const wrong: string = 1
