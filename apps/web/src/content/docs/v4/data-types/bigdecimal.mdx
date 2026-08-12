---
title: BigDecimal
description: The BigDecimal data type represents arbitrary-precision decimal numbers.
sidebar:
  order: 1
---

import { Aside } from "@astrojs/starlight/components"

In JavaScript, numbers are typically stored as 64-bit floating-point values. While floating-point numbers are fast and versatile, they can introduce small rounding errors. These are often hard to notice in everyday usage but can become problematic in areas like finance or statistics, where small inaccuracies may lead to larger discrepancies over time.

By using the BigDecimal module, you can avoid these issues and perform calculations with a higher degree of precision.

The `BigDecimal` data type can represent real numbers with a large number of decimal places, preventing the common errors of floating-point math (for example, 0.1 + 0.2 ≠ 0.3).

## How BigDecimal Works

A `BigDecimal` represents a number using two components:

1. `value`: A `BigInt` that stores the digits of the number.
2. `scale`: A 64-bit integer that determines the position of the decimal point.

The number represented by a `BigDecimal` is calculated as: value x 10<sup>-scale</sup>.

- If `scale` is zero or positive, it specifies the number of digits to the right of the decimal point.
- If `scale` is negative, the `value` is multiplied by 10 raised to the power of the negated scale.

For example:

- A `BigDecimal` with `value = 12345n` and `scale = 2` represents `123.45`.
- A `BigDecimal` with `value = 12345n` and `scale = -2` represents `1234500`.

The maximum precision is large but not infinite, limited to 2<sup>63</sup> decimal places.

## Creating a BigDecimal

### make

The `make` function creates a `BigDecimal` by specifying a `BigInt` value and a scale. The `scale` determines the number of digits to the right of the decimal point.

**Example** (Creating a BigDecimal with a Specified Scale)

```ts twoslash import.meta.vitest name="make-1"
import { BigDecimal } from "effect"

// Create a BigDecimal from a BigInt (1n) with a scale of 2
const decimal = BigDecimal.make(1n, 2)

console.log(decimal)
decimal // => BigDecimal.make(1n, 2)

// Convert the BigDecimal to a string
console.log(String(decimal))
String(decimal) // => "BigDecimal(0.01)"

// Format the BigDecimal as a standard decimal string
console.log(BigDecimal.format(decimal))
BigDecimal.format(decimal) // => "0.01"

// Convert the BigDecimal to exponential notation
console.log(BigDecimal.toExponential(decimal))
BigDecimal.toExponential(decimal) // => "1e-2"
```

### fromBigInt

The `fromBigInt` function creates a `BigDecimal` from a `bigint`. The `scale` defaults to `0`, meaning the number has no fractional part.

**Example** (Creating a BigDecimal from a BigInt)

```ts twoslash import.meta.vitest name="from-big-int-1"
import { BigDecimal } from "effect"

const decimal = BigDecimal.fromBigInt(10n)

console.log(decimal)
decimal // => BigDecimal.fromBigInt(10n)
```

### fromString

Parses a numerical string into a `BigDecimal`. Returns an `Option<BigDecimal>`:

- `Some(BigDecimal)` if the string is valid.
- `None` if the string is invalid.

**Example** (Parsing a String into a BigDecimal)

```ts twoslash import.meta.vitest name="from-string-1"
import { BigDecimal, Option } from "effect"

const decimal = BigDecimal.fromString("0.02")

console.log(decimal)
decimal // => Option.some(BigDecimal.make(2n, 2))
```

### unsafeFromString

The `fromStringUnsafe` function is a variant of `fromString` that throws an error if the input string is invalid. Use this only when you are confident that the input will always be valid.

**Example** (Unsafe Parsing of a String)

```ts twoslash import.meta.vitest name="unsafe-from-string-1"
import { BigDecimal } from "effect"

const decimal = BigDecimal.fromStringUnsafe("0.02")

console.log(decimal)
decimal // => BigDecimal.make(2n, 2)
```

### unsafeFromNumber

Creates a `BigDecimal` from a JavaScript `number`. Throws a `RangeError` for non-finite numbers (`NaN`, `+Infinity`, or `-Infinity`).

**Example** (Unsafe Parsing of a Number)

```ts twoslash import.meta.vitest name="unsafe-from-number-1"
import { BigDecimal } from "effect"

console.log(BigDecimal.fromNumberUnsafe(123.456))
BigDecimal.fromNumberUnsafe(123.456) // => BigDecimal.make(123456n, 3)
```

<Aside type="caution" title="Avoid Direct Conversion">
  Avoid converting floating-point numbers directly to `BigDecimal`, as their
  representation may already introduce precision issues.
</Aside>

## Basic Arithmetic Operations

The BigDecimal module supports a variety of arithmetic operations that provide precision and avoid the rounding errors common in standard JavaScript arithmetic. Below is a list of supported operations:

| Function          | Description                                                                                                    |
| ----------------- | -------------------------------------------------------------------------------------------------------------- |
| `sum`             | Adds two `BigDecimal` values.                                                                                  |
| `subtract`        | Subtracts one `BigDecimal` value from another.                                                                 |
| `multiply`        | Multiplies two `BigDecimal` values.                                                                            |
| `divide`          | Divides one `BigDecimal` value by another, returning an `Option<BigDecimal>`.                                  |
| `divideUnsafe`    | Divides one `BigDecimal` value by another, throwing an error if the divisor is zero.                           |
| `negate`          | Negates a `BigDecimal` value (i.e., changes its sign).                                                         |
| `remainder`       | Returns the remainder of dividing one `BigDecimal` value by another, returning an `Option<BigDecimal>`.        |
| `remainderUnsafe` | Returns the remainder of dividing one `BigDecimal` value by another, throwing an error if the divisor is zero. |
| `sign`            | Returns the sign of a `BigDecimal` value (`-1`, `0`, or `1`).                                                  |
| `abs`             | Returns the absolute value of a `BigDecimal`.                                                                  |

**Example** (Performing Basic Arithmetic with BigDecimal)

```ts twoslash import.meta.vitest name="basic-arithmetic-operations-1"
import { BigDecimal, Option } from "effect"

const dec1 = BigDecimal.fromStringUnsafe("1.05")
const dec2 = BigDecimal.fromStringUnsafe("2.10")

// Addition
console.log(String(BigDecimal.sum(dec1, dec2)))
String(BigDecimal.sum(dec1, dec2)) // => "BigDecimal(3.15)"

// Multiplication
console.log(String(BigDecimal.multiply(dec1, dec2)))
String(BigDecimal.multiply(dec1, dec2)) // => "BigDecimal(2.205)"

// Subtraction
console.log(String(BigDecimal.subtract(dec2, dec1)))
String(BigDecimal.subtract(dec2, dec1)) // => "BigDecimal(1.05)"

// Division (safe, returns Option<BigDecimal>)
console.log(BigDecimal.divide(dec2, dec1))
BigDecimal.divide(dec2, dec1) // => Option.some(BigDecimal.make(2n, 0))

// Division (unsafe, throws if divisor is zero)
console.log(String(BigDecimal.divideUnsafe(dec2, dec1)))
String(BigDecimal.divideUnsafe(dec2, dec1)) // => "BigDecimal(2)"

// Negation
console.log(String(BigDecimal.negate(dec1)))
String(BigDecimal.negate(dec1)) // => "BigDecimal(-1.05)"

// Modulus (unsafe, throws if divisor is zero)
console.log(
  String(BigDecimal.remainderUnsafe(dec2, BigDecimal.fromStringUnsafe("0.6"))),
)
String(BigDecimal.remainderUnsafe(dec2, BigDecimal.fromStringUnsafe("0.6"))) // => "BigDecimal(0.3)"
```

Using `BigDecimal` for arithmetic operations helps to avoid the inaccuracies commonly encountered with floating-point numbers in JavaScript. For example:

**Example** (Avoiding Floating-Point Errors)

```ts twoslash import.meta.vitest name="basic-arithmetic-operations-2"
const dec1 = 1.05
const dec2 = 2.1

console.log(String(dec1 + dec2))
String(dec1 + dec2) // => "3.1500000000000004"
```

## Comparison Operations

The `BigDecimal` module provides several functions for comparing decimal values. These allow you to determine the relative order of two values, find the minimum or maximum, and check specific properties like positivity or integer status.

### Comparison Functions

| Function                 | Description                                                              |
| ------------------------ | ------------------------------------------------------------------------ |
| `isLessThan`             | Checks if the first `BigDecimal` is smaller than the second.             |
| `isLessThanOrEqualTo`    | Checks if the first `BigDecimal` is smaller than or equal to the second. |
| `isGreaterThan`          | Checks if the first `BigDecimal` is larger than the second.              |
| `isGreaterThanOrEqualTo` | Checks if the first `BigDecimal` is larger than or equal to the second.  |
| `min`                    | Returns the smaller of two `BigDecimal` values.                          |
| `max`                    | Returns the larger of two `BigDecimal` values.                           |

**Example** (Comparing Two BigDecimal Values)

```ts twoslash import.meta.vitest name="comparison-functions-1"
import { BigDecimal } from "effect"

const dec1 = BigDecimal.fromStringUnsafe("1.05")
const dec2 = BigDecimal.fromStringUnsafe("2.10")

console.log(BigDecimal.isLessThan(dec1, dec2))
BigDecimal.isLessThan(dec1, dec2) // => true

console.log(BigDecimal.isLessThanOrEqualTo(dec1, dec2))
BigDecimal.isLessThanOrEqualTo(dec1, dec2) // => true

console.log(BigDecimal.isGreaterThan(dec1, dec2))
BigDecimal.isGreaterThan(dec1, dec2) // => false

console.log(BigDecimal.isGreaterThanOrEqualTo(dec1, dec2))
BigDecimal.isGreaterThanOrEqualTo(dec1, dec2) // => false

console.log(BigDecimal.min(dec1, dec2))
BigDecimal.min(dec1, dec2) // => BigDecimal.make(105n, 2)

console.log(BigDecimal.max(dec1, dec2))
BigDecimal.max(dec1, dec2) // => BigDecimal.make(210n, 2)
```

### Predicates for Comparison

The module also includes predicates to check specific properties of a `BigDecimal`:

| Predicate    | Description                                                    |
| ------------ | -------------------------------------------------------------- |
| `isZero`     | Checks if the value is exactly zero.                           |
| `isPositive` | Checks if the value is positive.                               |
| `isNegative` | Checks if the value is negative.                               |
| `between`    | Checks if the value lies within a specified range (inclusive). |
| `isInteger`  | Checks if the value is an integer (i.e., no fractional part).  |

**Example** (Checking the Sign and Properties of BigDecimal Values)

```ts twoslash import.meta.vitest name="predicates-for-comparison-1"
import { BigDecimal } from "effect"

const dec1 = BigDecimal.fromStringUnsafe("1.05")
const dec2 = BigDecimal.fromStringUnsafe("-2.10")

console.log(BigDecimal.isZero(BigDecimal.fromStringUnsafe("0")))
BigDecimal.isZero(BigDecimal.fromStringUnsafe("0")) // => true

console.log(BigDecimal.isPositive(dec1))
BigDecimal.isPositive(dec1) // => true

console.log(BigDecimal.isNegative(dec2))
BigDecimal.isNegative(dec2) // => true

console.log(
  BigDecimal.between({
    minimum: BigDecimal.fromStringUnsafe("1"),
    maximum: BigDecimal.fromStringUnsafe("2"),
  })(dec1),
)
BigDecimal.between({
  minimum: BigDecimal.fromStringUnsafe("1"),
  maximum: BigDecimal.fromStringUnsafe("2"),
})(dec1) // => true

console.log(
  BigDecimal.isInteger(dec2),
  BigDecimal.isInteger(BigDecimal.fromBigInt(3n)),
)
BigDecimal.isInteger(dec2) // => false
BigDecimal.isInteger(BigDecimal.fromBigInt(3n)) // => true
```

## Normalization and Equality

In some cases, two `BigDecimal` values can have different internal representations but still represent the same number.

For example, `1.05` could be internally represented with different scales, such as:

- `105n` with a scale of `2`
- `1050n` with a scale of `3`

To ensure consistency, you can normalize a `BigDecimal` to adjust the scale and remove trailing zeros.

### Normalization

The `BigDecimal.normalize` function adjusts the scale of a `BigDecimal` and eliminates any unnecessary trailing zeros in its internal representation.

**Example** (Normalizing a BigDecimal)

```ts twoslash import.meta.vitest name="normalization-1"
import { BigDecimal } from "effect"

const dec = BigDecimal.make(1050n, 3)

console.log(BigDecimal.normalize(dec))
BigDecimal.normalize(dec) // => BigDecimal.make(105n, 2)
```

### Equality

To check if two `BigDecimal` values are numerically equal, regardless of their internal representation, use the `BigDecimal.equals` function.

**Example** (Checking Equality)

```ts twoslash import.meta.vitest name="equality-1"
import { BigDecimal } from "effect"

const dec1 = BigDecimal.make(105n, 2)
const dec2 = BigDecimal.make(1050n, 3)

console.log(BigDecimal.equals(dec1, dec2))
BigDecimal.equals(dec1, dec2) // => true
```
