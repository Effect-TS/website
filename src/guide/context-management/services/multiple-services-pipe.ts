import { Effect, Context } from "effect"

interface Random {
  readonly next: () => Effect.Effect<never, never, number>
}

const Random = Context.Tag<Random>()

interface Logger {
  readonly log: (message: string) => Effect.Effect<never, never, void>
}

const Logger = Context.Tag<Logger>()

// $ExpectType Effect<Random | Logger, never, void>
const program = Effect.all([Random, Logger]).pipe(
  Effect.flatMap(([random, logger]) =>
    random
      .next()
      .pipe(Effect.flatMap((randomNumber) => logger.log(String(randomNumber))))
  )
)

const runnable1 = program.pipe(
  Effect.provideService(
    Random,
    Random.of({
      next: () => Effect.succeed(Math.random())
    })
  ),
  Effect.provideService(
    Logger,
    Logger.of({
      log: Effect.log
    })
  )
)

// Context<Random | Logger>
const context = Context.empty().pipe(
  Context.add(Random, Random.of({ next: () => Effect.succeed(Math.random()) })),
  Context.add(
    Logger,
    Logger.of({
      log: Effect.log
    })
  )
)

const runnable2 = Effect.provideContext(program, context)
