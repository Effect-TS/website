import { Effect, Context, Console } from "effect"

class Random extends Context.Tag("Random")<
  Random,
  {
    readonly next: Effect.Effect<number>
  }
>() {}

class Logger extends Context.Tag("Logger")<
  Logger,
  {
    readonly log: (message: string) => Effect.Effect<void>
  }
>() {}

// $ExpectType Effect<Random | Logger, never, void>
const program = Effect.all([Random, Logger]).pipe(
  Effect.flatMap(([random, logger]) =>
    random.next.pipe(
      Effect.flatMap((randomNumber) => logger.log(String(randomNumber)))
    )
  )
)

const runnable1 = program.pipe(
  Effect.provideService(Random, {
    next: Effect.sync(() => Math.random())
  }),
  Effect.provideService(Logger, {
    log: Console.log
  })
)

// $ExpectType Context<Random | Logger>
const context = Context.empty().pipe(
  Context.add(Random, { next: Effect.sync(() => Math.random()) }),
  Context.add(Logger, { log: Console.log })
)

const runnable2 = Effect.provide(program, context)
