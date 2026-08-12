---
title: Cron
description: Explore cron scheduling in Effect for executing actions at specific times and intervals.
sidebar:
  order: 4
---

import { Aside } from "@astrojs/starlight/components"

The Cron module lets you define schedules in a style similar to [UNIX cron expressions](https://en.wikipedia.org/wiki/Cron).
It also supports partial constraints (e.g., certain months or weekdays), time zone awareness through the [DateTime](/docs/v4/data-types/datetime/) module, and robust error handling.

This module helps you:

- **Create** a `Cron` instance from individual parts.
- **Parse and validate** cron expressions.
- **Match** existing dates to see if they satisfy a given cron schedule.
- **Find** the next occurrence of a schedule after a given date.
- **Iterate** over future dates that match a schedule.
- **Convert** a `Cron` instance to a `Schedule` for use in effectful programs.

## Creating a Cron

You can define a cron schedule by specifying numeric constraints for seconds, minutes, hours, days, months, and weekdays. The `make` function requires you to define all fields representing the schedule's constraints.

**Example** (Creating a Cron)

```ts twoslash import.meta.vitest name="creating-a-cron-1"
import { Cron, DateTime } from "effect"

// Build a cron that triggers at 4:00 AM
// on the 8th to the 14th of each month
const cron = Cron.make({
  seconds: [0], // Trigger at the start of a minute
  minutes: [0], // Trigger at the start of an hour
  hours: [4], // Trigger at 4:00 AM
  days: [8, 9, 10, 11, 12, 13, 14], // Specific days of the month
  months: [], // No restrictions on the month
  weekdays: [], // No restrictions on the weekday
  tz: DateTime.zoneMakeNamedUnsafe("Europe/Rome"), // Optional time zone
})

const hours = [...cron.hours]
hours // => [4]
```

- `seconds`, `minutes`, and `hours`: Define the time of day.
- `days` and `months`: Specify which calendar days and months are valid.
- `weekdays`: Restrict the schedule to specific days of the week.
- `tz`: Optionally define the time zone for the schedule.

If any field is left empty (e.g., `months`), it is treated as having "no constraints," allowing any valid value for that part of the date.

## Parsing Cron Expressions

Instead of manually constructing a `Cron`, you can use UNIX-like cron strings and parse them with `parse` or `parseUnsafe`.

### parse

The `parse(cronExpression, tz?)` function safely parses a cron string into a `Cron` instance. It returns a [Result](/docs/v4/data-types/result/), which will contain either the parsed `Cron` or a parsing error.

**Example** (Safely Parsing a Cron Expression)

```ts twoslash import.meta.vitest name="safely-parsing-a-cron-expression-1"
import { Result, Cron } from "effect"

// Define a cron expression for 4:00 AM
// on the 8th to the 14th of every month
const expression = "0 0 4 8-14 * *"

// Parse the cron expression
const result = Cron.parse(expression)

if (Result.isSuccess(result)) {
  // Successfully parsed
  console.log("Parsed cron:", result.success)
} else {
  // Parsing failed
  console.error("Failed to parse cron:", result.failure.message)
}

Result.isSuccess(result) // => true
```

### parseUnsafe

The `parseUnsafe(cronExpression, tz?)` function works like [parse](#parse), but instead of returning a [Result](/docs/v4/data-types/result/), it throws an exception if the input is invalid.

**Example** (Parsing a Cron Expression)

```ts twoslash import.meta.vitest name="parsing-a-cron-expression-1"
import { Cron } from "effect"

// Parse a cron expression for 4:00 AM
// on the 8th to the 14th of every month
// Throws if the expression is invalid
const cron = Cron.parseUnsafe("0 0 4 8-14 * *")

const hours = [...cron.hours]
hours // => [4]
```

## Checking Dates with match

The `match` function allows you to determine if a given `Date` (or any [DateTime.Input](/docs/v4/data-types/datetime/#the-datetimeinput-type)) satisfies the constraints of a cron schedule.

If the date meets the schedule's conditions, `match` returns `true`. Otherwise, it returns `false`.

**Example** (Checking if a Date Matches a Cron Schedule)

```ts twoslash import.meta.vitest name="checking-if-a-date-matches-a-cron-schedule-1"
import { Cron } from "effect"

// Suppose we have a cron that triggers at 4:00 AM
// on the 8th to the 14th of each month
const cron = Cron.parseUnsafe("0 0 4 8-14 * *")

const checkDate = new Date("2025-01-08 04:00:00")

console.log(Cron.match(cron, checkDate))
Cron.match(cron, checkDate) // => true
```

## Finding the Next Run

The `next` function determines the next date that satisfies a given cron schedule, starting from a specified date. If no starting date is provided, the current time is used as the starting point.

If `next` cannot find a matching date within a predefined number of iterations, it throws an error to prevent infinite loops.

**Example** (Determining the Next Matching Date)

```ts twoslash import.meta.vitest name="determining-the-next-matching-date-1"
import { Cron } from "effect"

// Define a cron expression for 4:00 AM
// on the 8th to the 14th of every month
const cron = Cron.parseUnsafe("0 0 4 8-14 * *", "UTC")

// Specify the starting point for the search
const after = new Date("2025-01-08")

// Find the next matching date
const nextDate = Cron.next(cron, after)

console.log(nextDate)
nextDate.toISOString() // => "2025-01-08T04:00:00.000Z"
```

## Iterating Over Future Dates

To generate multiple future dates that match a cron schedule, you can use the `sequence` function. This function provides an infinite iterator of matching dates, starting from a specified date.

**Example** (Generating Future Dates with an Iterator)

```ts import.meta.vitest name="generating-future-dates-with-an-iterator-1"
import { Cron } from "effect"

// Define a cron expression for 4:00 AM
// on the 8th to the 14th of every month
const cron = Cron.parseUnsafe("0 0 4 8-14 * *", "UTC")

// Specify the starting date
const start = new Date("2021-01-08")

// Create an iterator for the schedule
const iterator = Cron.sequence(cron, start)

// Get the first matching date after the start date
const first = iterator.next().value
console.log(first)
first?.toISOString() // => "2021-01-08T04:00:00.000Z"

// Get the second matching date after the start date
const second = iterator.next().value
console.log(second)
second?.toISOString() // => "2021-01-09T04:00:00.000Z"
```

## Converting to Schedule

The Schedule module allows you to define recurring behaviors, such as retries or periodic events. The `cron` function bridges the `Cron` module with the Schedule module, enabling you to create schedules based on cron expressions or `Cron` instances.

### cron

The `Schedule.cron` function generates a [Schedule](/docs/v4/scheduling/introduction/) that triggers at the start of each interval defined by the provided cron expression or `Cron` instance. When triggered, the schedule produces a tuple `[start, end]` representing the timestamps (in milliseconds) of the cron interval window.

**Example** (Creating a Schedule from a Cron)

```ts twoslash collapse={4-30} import.meta.vitest name="creating-a-schedule-from-a-cron-1"
import { Effect, Schedule, Fiber, Cron, Console, Duration } from "effect"
import { TestClock } from "effect/testing"

// A helper function to log output at each interval of the schedule
const log = <A>(
  action: Effect.Effect<A>,
  schedule: Schedule.Schedule<Duration.Duration, unknown, Cron.CronParseError>,
) => {
  let i = 0

  return Effect.gen(function* () {
    const fiber = yield* Effect.gen(function* () {
      yield* action
      i++
    }).pipe(
      Effect.repeat(
        schedule.pipe(
          // Limit the number of iterations for the example
          Schedule.upTo({ times: 10 }),
          Schedule.tap(({ now, output }) =>
            Console.log(
              i === 11 ? "..." : new Date(now + Duration.toMillis(output)),
            ),
          ),
        ),
      ),
      Effect.forkChild,
    )
    yield* TestClock.adjust(Infinity)
    yield* Fiber.join(fiber)
  }).pipe(Effect.provide(TestClock.layer()), Effect.runPromise)
}

// Build a cron that triggers at 4:00 AM
// on the 8th to the 14th of each month
const cron = Cron.parseUnsafe("0 0 4 8-14 * *", "UTC")

// Convert the Cron into a Schedule
const schedule = Schedule.cron(cron)

// Define a dummy action to repeat
const action = Effect.void

// Log the schedule intervals
await log(action, schedule)
/*
Output:
1970-01-08T04:00:00.000Z
1970-01-09T04:00:00.000Z
1970-01-10T04:00:00.000Z
1970-01-11T04:00:00.000Z
1970-01-12T04:00:00.000Z
1970-01-13T04:00:00.000Z
1970-01-14T04:00:00.000Z
1970-02-08T04:00:00.000Z
1970-02-09T04:00:00.000Z
1970-02-10T04:00:00.000Z
...
*/

// The schedule fires at the same instants the Cron itself reports,
// starting from the Unix epoch (TestClock starts at time 0)
const iterator = Cron.sequence(cron, new Date(0))
const firstTen = Array.from({ length: 10 }, () =>
  iterator.next().value?.toISOString(),
)
firstTen // => ["1970-01-08T04:00:00.000Z", "1970-01-09T04:00:00.000Z", "1970-01-10T04:00:00.000Z", "1970-01-11T04:00:00.000Z", "1970-01-12T04:00:00.000Z", "1970-01-13T04:00:00.000Z", "1970-01-14T04:00:00.000Z", "1970-02-08T04:00:00.000Z", "1970-02-09T04:00:00.000Z", "1970-02-10T04:00:00.000Z"]
```

<Aside type="note" title="Using a Real Clock">
  In a real application, you do not need to use the `TestClock` or
  `TestContext`. These are only necessary for simulating time and controlling
  the execution in test environments.
</Aside>
