---
title: Default Services
description: Learn about the default services in Effect, including Clock, Console, Random, ConfigProvider, and Tracer, and how they are automatically provided for your programs.
sidebar:
  order: 1
---

Effect comes equipped with live implementations of five services: `Clock`, `ConfigProvider`, `Console`, `Random`, and `Tracer`.

When we employ these services, there's no need to explicitly provide their implementations. Effect automatically supplies live versions of these services to our effects, sparing us from manual setup.

**Example** (Using Clock and Console)

```ts twoslash import.meta.vitest name="default-services-1"
import { Effect, Clock, Console } from "effect"

//      ┌─── Effect<void, never, never>
//      ▼
const program = Effect.gen(function* () {
  const now = yield* Clock.currentTimeMillis
  yield* Console.log(`Application started at ${new Date(now)}`)
})

Effect.runFork(program)
// Output: Application started at <current time>

await Effect.runPromise(program) // => undefined
```

As you can observe, even if our program utilizes both `Clock` and `Console`, the `Requirements` parameter, representing the services required for the effect to execute, remains set to `never`.
Effect takes care of handling these services seamlessly for us.

## Overriding Default Services

Each default service is exposed as a `Context.Reference`: `Clock.Clock`, `ConfigProvider.ConfigProvider`, `Console.Console`, `Random.Random`, and `Tracer.Tracer`. Use `Effect.provideService` to run an effect with a different implementation. The override applies only to the effect being provided.

Some modules also provide higher-level helpers for common overrides. For example, `Random.withSeed` installs a deterministic random-number generator for an effect.

**Example** (Overriding Random Service)

```ts twoslash import.meta.vitest name="overriding-default-services-1"
import { Effect, Random } from "effect"

// A program that logs a random number
const program = Effect.gen(function* () {
  console.log(yield* Random.next)
})

Effect.runSync(program)
// Example Output: 0.23208633934454326 (varies each run)

// Override the Random service with a seeded generator
const override = program.pipe(Random.withSeed("myseed"))

Effect.runSync(override)
// Output: 0.10428056576185751 (consistent output with the seed)

// The seed makes the generated value fully deterministic
Effect.runSync(Random.next.pipe(Random.withSeed("myseed"))) // => 0.10428056576185751
```
