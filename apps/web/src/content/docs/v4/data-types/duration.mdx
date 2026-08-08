---
title: Duration
description: Work with precise time spans using Effect's Duration, supporting creation, comparison, and arithmetic operations for efficient time handling.
sidebar:
  order: 6
---

The `Duration` data type represents non-negative spans of time. It is commonly used for timeouts, delays, and scheduling, and provides operations for working with different time units.

## Creating Durations

The Duration module includes several constructors to create durations in different units.

**Example** (Creating Durations in Various Units)

```ts twoslash import.meta.vitest name="creating-durations-1"
import { Duration } from "effect"

// Create a duration of 100 milliseconds
const duration1 = Duration.millis(100)

// Create a duration of 2 seconds
const duration2 = Duration.seconds(2)

// Create a duration of 5 minutes
const duration3 = Duration.minutes(5)

Duration.toMillis(duration3) // => 300000
```

You can create durations using units such as nanoseconds, microsecond, milliseconds, seconds, minutes, hours, days, and weeks.

For an infinite duration, use `Duration.infinity`.

**Example** (Creating an Infinite Duration)

```ts twoslash import.meta.vitest name="creating-durations-2"
import { Duration } from "effect"

console.log(String(Duration.infinity))
String(Duration.infinity) // => "Infinity"
```

Another option for creating durations is using the `Duration.fromInputUnsafe` helper:

- `number` values are treated as milliseconds.
- `bigint` values are treated as nanoseconds.
- Strings must follow the format `"${number} ${unit}"`.

**Example** (Decoding Values into Durations)

```ts twoslash import.meta.vitest name="creating-durations-3"
import { Duration } from "effect"

Duration.fromInputUnsafe(10n) // => Duration.nanos(10n)
Duration.fromInputUnsafe(100) // => Duration.millis(100)
Duration.fromInputUnsafe(Infinity) // => Duration.infinity

Duration.fromInputUnsafe("10 nanos") // => Duration.nanos(10n)
Duration.fromInputUnsafe("20 micros") // => Duration.micros(20n)
Duration.fromInputUnsafe("100 millis") // => Duration.millis(100)
Duration.fromInputUnsafe("2 seconds") // => Duration.seconds(2)
Duration.fromInputUnsafe("5 minutes") // => Duration.minutes(5)
Duration.fromInputUnsafe("7 hours") // => Duration.hours(7)
Duration.fromInputUnsafe("3 weeks") // => Duration.weeks(3)
```

## Getting the Duration Value

You can retrieve the value of a duration in milliseconds using `Duration.toMillis`.

**Example** (Getting Duration in Milliseconds)

```ts twoslash import.meta.vitest name="getting-the-duration-value-1"
import { Duration } from "effect"

console.log(Duration.toMillis(Duration.seconds(30)))
Duration.toMillis(Duration.seconds(30)) // => 30000
```

To get the value of a duration in nanoseconds, use `Duration.toNanos`. Note that `toNanos` returns an `Option<bigint>` because the duration might be infinite.

**Example** (Getting Duration in Nanoseconds)

```ts twoslash import.meta.vitest name="getting-the-duration-value-2"
import { Duration, Option } from "effect"

console.log(Duration.toNanos(Duration.millis(100)))
Duration.toNanos(Duration.millis(100)) // => Option.some(100000000n)
```

To get a `bigint` value without `Option`, use `Duration.toNanosUnsafe`. However, it will throw an error for infinite durations.

**Example** (Retrieving Nanoseconds Unsafely)

```ts twoslash
import { Duration } from "effect"

console.log(Duration.toNanosUnsafe(Duration.millis(100)))
// Output: 100000000n

console.log(Duration.toNanosUnsafe(Duration.infinity))
/*
throws:
Error: Cannot convert infinite duration to nanos
  ...stack trace...
*/
```

## Comparing Durations

Use the following functions to compare two durations:

| API                      | Description                                                                  |
| ------------------------ | ---------------------------------------------------------------------------- |
| `isLessThan`             | Returns `true` if the first duration is less than the second.                |
| `isLessThanOrEqualTo`    | Returns `true` if the first duration is less than or equal to the second.    |
| `isGreaterThan`          | Returns `true` if the first duration is greater than the second.             |
| `isGreaterThanOrEqualTo` | Returns `true` if the first duration is greater than or equal to the second. |

**Example** (Comparing Two Durations)

```ts twoslash import.meta.vitest name="comparing-durations-1"
import { Duration } from "effect"

const duration1 = Duration.seconds(30)
const duration2 = Duration.minutes(1)

console.log(Duration.isLessThan(duration1, duration2))
Duration.isLessThan(duration1, duration2) // => true

console.log(Duration.isLessThanOrEqualTo(duration1, duration2))
Duration.isLessThanOrEqualTo(duration1, duration2) // => true

console.log(Duration.isGreaterThan(duration1, duration2))
Duration.isGreaterThan(duration1, duration2) // => false

console.log(Duration.isGreaterThanOrEqualTo(duration1, duration2))
Duration.isGreaterThanOrEqualTo(duration1, duration2) // => false
```

## Performing Arithmetic Operations

You can perform arithmetic operations on durations, like addition and multiplication.

**Example** (Adding and Multiplying Durations)

```ts twoslash import.meta.vitest name="performing-arithmetic-operations-1"
import { Duration } from "effect"

const duration1 = Duration.seconds(30)
const duration2 = Duration.minutes(1)

// Add two durations
console.log(String(Duration.sum(duration1, duration2)))
String(Duration.sum(duration1, duration2)) // => "90000 millis"

// Multiply a duration by a factor
console.log(String(Duration.times(duration1, 2)))
String(Duration.times(duration1, 2)) // => "60000 millis"
```

## Conversions

Converts a `Duration` to a human readable string.

**Example**

```ts twoslash import.meta.vitest name="conversions-1"
import { Duration } from "effect"

Duration.format(Duration.millis(1000)) // => "1s"
Duration.format(Duration.millis(1001)) // => "1s 1ms"
```
