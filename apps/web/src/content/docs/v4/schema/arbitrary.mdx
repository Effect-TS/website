---
title: Schema to Arbitrary
description: Derive fast-check arbitraries from schemas and customize generation with filters, candidates, and annotations.
sidebar:
  label: Arbitrary
  order: 15
---

import { Aside } from "@astrojs/starlight/components"

`Schema.toArbitrary` derives a [fast-check](https://fast-check.dev/) `Arbitrary` that generates values of a schema's `Type`.

**Example** (Generating Values from a Schema)

```ts twoslash import.meta.vitest name="schema-to-arbitrary-1"
import { Schema } from "effect"
import { FastCheck } from "effect/testing"

const Person = Schema.Struct({
  name: Schema.NonEmptyString,
  age: Schema.Int.check(Schema.isBetween({ minimum: 18, maximum: 80 })),
})

const arbitrary = Schema.toArbitrary(Person)

const samples = FastCheck.sample(arbitrary, 10)

samples.every(({ name, age }) => name.length > 0 && age >= 18 && age <= 80) // => true
```

<Aside type="tip" title="FastCheck API">
  Effect re-exports the complete fast-check API as `FastCheck` from
  `effect/testing`.
</Aside>

Use `Schema.toArbitraryLazy` when the caller should provide the fast-check module.

**Example** (Deferring Arbitrary Creation)

```ts twoslash import.meta.vitest name="schema-to-arbitrary-lazy-1"
import { Schema } from "effect"
import { FastCheck } from "effect/testing"

const makeArbitrary = Schema.toArbitraryLazy(Schema.String)
const arbitrary = makeArbitrary(FastCheck)

FastCheck.sample(arbitrary, 1).every((value) => typeof value === "string") // => true
```

`Schema.Never` and declaration schemas without a `toArbitrary` annotation cannot be derived automatically. Impossible constraints and recursive schemas without a finite terminal path also fail immediately.

## Filters

Generated values are always checked by the schema's type-side filters before they are returned. Built-in filters also provide metadata that lets derivation choose an efficient generator instead of relying only on fast-check discards.

**Example** (Using Built-In Constraints)

```ts twoslash import.meta.vitest name="arbitrary-built-in-constraints-1"
import { Schema } from "effect"
import { FastCheck } from "effect/testing"

const Username = Schema.String.check(
  Schema.isMinLength(3),
  Schema.isMaxLength(20),
  Schema.isPattern(/^[a-z0-9_]+$/),
)

const samples = FastCheck.sample(Schema.toArbitrary(Username), 20)

samples.every(
  (value) =>
    value.length >= 3 && value.length <= 20 && /^[a-z0-9_]+$/.test(value),
) // => true
```

Length, range, integer, pattern, uniqueness, and other built-in constraints are translated to the corresponding fast-check constraints where possible.

### Opaque Filters and Reports

A custom filter without arbitrary metadata is still correct because every generated value is checked. It may be inefficient when valid values are rare.

Pass `{ report: true }` to find filters that could not guide generation. An `OpaqueFilter` warning means that the predicate is enforced but does not help construct the base arbitrary.

**Example** (Inspecting Derivation Warnings)

```ts twoslash import.meta.vitest name="arbitrary-report-1"
import { Schema } from "effect"

const isPalindrome = (value: string) =>
  value === Array.from(value).reverse().join("")

const Palindrome = Schema.String.check(
  Schema.makeFilter(isPalindrome, { expected: "a palindrome" }),
)

const result = Schema.toArbitrary(Palindrome, { report: true })

result.report.warnings[0]?._tag // => "OpaqueFilter"
```

Reports contain warnings only. Unsupported schemas, impossible constraints, invalid candidates, and invalid recursion still throw during derivation.

### Custom Filters with Constraints

If a custom filter can partially describe its valid values using normal generation constraints, attach an `arbitrary.constraint` annotation. The predicate remains the final authority.

**Example** (Guiding a Prime Number Generator)

```ts twoslash
import { Order, Schema } from "effect"

const isPrime = (value: number) => {
  if (!Number.isInteger(value) || value < 2) return false
  for (let divisor = 2; divisor * divisor <= value; divisor++) {
    if (value % divisor === 0) return false
  }
  return true
}

const prime = Schema.makeFilter(isPrime, {
  expected: "a prime number",
  arbitrary: {
    constraint: {
      integer: true,
      ordered: {
        order: Order.Number,
        minimum: 2,
      },
    },
  },
})

const Prime = Schema.Finite.check(prime)
```

The constraint avoids non-integers and numbers below `2`; the filter still checks primality.

### Custom Filters with Candidates

Use a candidate when a filter cannot be expressed with the constraint vocabulary. Candidates are weighted alternatives to the base generator, and their values are still checked by every filter.

**Example** (Supplying Palindrome Candidates)

```ts twoslash import.meta.vitest name="arbitrary-candidate-1"
import { Schema } from "effect"
import { FastCheck } from "effect/testing"

const reverse = (value: string) => Array.from(value).reverse().join("")
const isPalindrome = (value: string) => value === reverse(value)

const palindrome = Schema.makeFilter(isPalindrome, {
  expected: "a palindrome",
  arbitrary: {
    candidate: {
      weight: 5,
      make: (fc) => fc.string().map((half) => `${half}${reverse(half)}`),
    },
  },
})

const Palindrome = Schema.String.check(palindrome)
const samples = FastCheck.sample(Schema.toArbitrary(Palindrome), 20)

samples.every(isPalindrome) // => true
```

The base generator has weight `1`; a candidate also defaults to `1` unless you provide another positive integer.

## Transformations

`Schema.toArbitrary` generates the schema's `Type`, not its `Encoded`. For a codec, derivation therefore follows the type-side schema and its constraints.

**Example** (Generating the Type Side of a Codec)

```ts twoslash import.meta.vitest name="arbitrary-codec-type-side-1"
import { Schema } from "effect"
import { FastCheck } from "effect/testing"

const schema = Schema.FiniteFromString
const samples = FastCheck.sample(Schema.toArbitrary(schema), 20)

samples.every((value) => typeof value === "number" && Number.isFinite(value)) // => true
```

If you need encoded values, generate `Schema.toEncoded(schema)` instead.

## Schema-Level Overrides

Use a `toArbitrary` annotation to replace the generator for a schema node. Put the override on the base schema when possible, before adding filters, so the filters remain independent final checks.

**Example** (Providing a Custom Generator)

```ts twoslash import.meta.vitest name="customizing-arbitrary-data-generation-1"
import { Schema } from "effect"
import { FastCheck } from "effect/testing"

const Name = Schema.String.annotate({
  toArbitrary: () => (fc) => fc.constantFrom("Alice", "Dante", "Marta"),
}).check(Schema.isNonEmpty())

const Person = Schema.Struct({
  name: Name,
  age: Schema.Int.check(Schema.isBetween({ minimum: 18, maximum: 80 })),
})

const samples = FastCheck.sample(Schema.toArbitrary(Person), 20)

samples.every(({ name }) => ["Alice", "Dante", "Marta"].includes(name)) // => true
```

Avoid placing an override after filters unless it intentionally handles those filters. For example, an override that always produces `""` cannot satisfy a preceding `Schema.isNonEmpty()` check and will exhaust fast-check's discard budget.
