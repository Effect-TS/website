---
title: Filters
description: Define custom validation logic with filters to enhance data validation beyond basic type checks.
sidebar:
  order: 4
---

import { Aside } from "@astrojs/starlight/components"

Developers can define custom validation logic beyond basic type checks, giving more control over how data is validated.

## Declaring Filters

Create a filter with `Schema.makeFilter`, then add it to a schema with `.check(...)`. The predicate receives a decoded value and returns whether it satisfies the constraint, optionally providing one or more issues when it does not.

**Example** (Defining a Minimum String Length Filter)

```ts twoslash
import { Schema } from "effect"

// Define a string schema with a filter to ensure the string
// is at least 10 characters long
const LongString = Schema.String.check(
  Schema.makeFilter(
    // Custom error message for strings shorter than 10 characters
    (s) => s.length >= 10 || "a string at least 10 characters long",
  ),
)

//     ┌─── string
//     ▼
type Type = typeof LongString.Type

console.log(Schema.decodeUnknownSync(LongString)("a"))
/*
throws:
SchemaError: a string at least 10 characters long
*/
```

Note that the filter does not alter the schema's `Type`:

```ts showLineNumbers=false
//     ┌─── string
//     ▼
type Type = typeof LongString.Type
```

Filters add additional validation constraints without modifying the schema's underlying type.

<Aside type="tip">
  If you need to modify the `Type`, consider using [Branded
  types](/docs/v4/schema/advanced-usage#branded-types).
</Aside>

## The Predicate Function

The predicate function in a filter follows this structure:

```ts
type Predicate<T> = (
  input: T,
  ast: SchemaAST.AST,
  options: SchemaAST.ParseOptions,
) => FilterOutput
```

where

```ts
type FilterIssue =
  | string
  | SchemaIssue.Issue
  | {
      readonly path: ReadonlyArray<PropertyKey>
      readonly issue: string | SchemaIssue.Issue
    }

type FilterOutput =
  undefined | boolean | FilterIssue | ReadonlyArray<FilterIssue>
```

The filter's predicate can return several types of values, each affecting validation in a different way:

| Return Type                  | Behavior                                                                                         |
| ---------------------------- | ------------------------------------------------------------------------------------------------ |
| `true` or `undefined`        | The data satisfies the filter's condition and passes validation.                                 |
| `false`                      | The data does not meet the condition, and no specific error message is provided.                 |
| `string`                     | The validation fails, and the provided string is used as the error message.                      |
| `SchemaIssue.Issue`          | The validation fails with a detailed error structure, specifying where and why it failed.        |
| `FilterIssue`                | Allows for more detailed error messages with specific paths, providing enhanced error reporting. |
| `ReadonlyArray<FilterIssue>` | An array of issues can be returned if multiple validation errors need to be reported.            |

<Aside type="tip" title="Effectful Filters">
  Normal filters only handle synchronous, non-effectful validations. If you need
  filters that involve asynchronous logic or services, use
  `SchemaGetter.checkEffect` as part of a
  [transformation](/docs/v4/schema/transformations#effectful-filters).
</Aside>

## Adding Annotations

Embedding metadata within the schema, such as identifiers, JSON schema specifications, and descriptions, enhances understanding and analysis of the schema's constraints and purpose.

**Example** (Adding Metadata with Annotations)

```ts twoslash
import { Schema } from "effect"

const LongString = Schema.String.check(
  Schema.makeFilter(
    (s) =>
      s.length >= 10 ? undefined : "a string at least 10 characters long",
    {
      identifier: "LongString",
      toJsonSchema: () => ({ minLength: 10 }),
      description: "Lorem ipsum dolor sit amet, ...",
    },
  ),
)

console.log(Schema.decodeUnknownSync(LongString)("a"))
/*
throws:
SchemaError: a string at least 10 characters long
*/

console.log(JSON.stringify(Schema.toJsonSchemaDocument(LongString), null, 2))
/*
Output:
{
  "dialect": "draft-2020-12",
  "schema": {
    "$ref": "#/$defs/LongString"
  },
  "definitions": {
    "LongString": {
      "type": "string",
      "allOf": [
        {
          "minLength": 10,
          "description": "Lorem ipsum dolor sit amet, ..."
        }
      ]
    }
  }
}
*/
```

## Specifying Error Paths

When validating forms or structured data, it's possible to associate specific error messages with particular fields or paths. This enhances error reporting and is especially useful when integrating with libraries like [react-hook-form](https://react-hook-form.com/).

**Example** (Matching Passwords)

```ts twoslash import.meta.vitest name="specifying-error-paths-1"
import { Result, Schema, SchemaIssue } from "effect"

const Password = Schema.Trim.check(Schema.isMinLength(2))

const MyForm = Schema.Struct({
  password: Password,
  confirm_password: Password,
}).check(
  // Add a filter to ensure that passwords match
  Schema.makeFilter((input) =>
    input.password === input.confirm_password
      ? undefined
      : // Return an error message associated
        // with the "confirm_password" field
        {
          path: ["confirm_password"],
          issue: "Passwords do not match",
        },
  ),
)

const result = Schema.decodeUnknownResult(MyForm)({
  password: "abc",
  confirm_password: "abd", // Confirm password does not match
})

if (Result.isFailure(result)) {
  console.log(
    JSON.stringify(
      SchemaIssue.makeFormatterStandardSchemaV1()(result.failure.issue).issues,
      null,
      2,
    ),
  )
  SchemaIssue.makeFormatterStandardSchemaV1()(result.failure.issue).issues // => [{ path: ["confirm_password"], message: "Passwords do not match" }]
}
/*
Output:
[
  {
    "path": [
      "confirm_password"
    ],
    "message": "Passwords do not match"
  }
]
*/
```

In this example, we define a `MyForm` schema with two password fields (`password` and `confirm_password`). We use `Schema.makeFilter` to check that both passwords match. If they don't, an error message is returned, specifically associated with the `confirm_password` field. This makes it easier to pinpoint the exact location of the validation failure.

The error is formatted as a Standard Schema issue array with `SchemaIssue.makeFormatterStandardSchemaV1`, making it easier to post-process or pass to form libraries.

<Aside type="tip" title="Formatting Structured Errors">
  For the other available representations, see [Error
  Formatters](/docs/v4/schema/error-formatters).
</Aside>

## Multiple Error Reporting

The `Schema.makeFilter` API supports reporting multiple validation issues at once, which is especially useful in scenarios like form validation where several checks might fail simultaneously.

**Example** (Reporting Multiple Validation Errors)

```ts twoslash import.meta.vitest name="multiple-error-reporting-1"
import { Result, Schema, SchemaIssue } from "effect"

const Password = Schema.Trim.check(Schema.isMinLength(2))
const OptionalString = Schema.optional(Schema.String)

const MyForm = Schema.Struct({
  password: Password,
  confirm_password: Password,
  name: OptionalString,
  surname: OptionalString,
}).check(
  Schema.makeFilter((input) => {
    const issues: Array<Schema.FilterIssue> = []

    // Check if passwords match
    if (input.password !== input.confirm_password) {
      issues.push({
        path: ["confirm_password"],
        issue: "Passwords do not match",
      })
    }

    // Ensure either name or surname is present
    if (!input.name && !input.surname) {
      issues.push({
        path: ["surname"],
        issue: "Surname must be present if name is not present",
      })
    }
    return issues
  }),
)

const result = Schema.decodeUnknownResult(MyForm)({
  password: "abc",
  confirm_password: "abd", // Confirm password does not match
})

if (Result.isFailure(result)) {
  console.log(
    JSON.stringify(
      SchemaIssue.makeFormatterStandardSchemaV1()(result.failure.issue).issues,
      null,
      2,
    ),
  )
  SchemaIssue.makeFormatterStandardSchemaV1()(result.failure.issue).issues // => [{ path: ["confirm_password"], message: "Passwords do not match" }, { path: ["surname"], message: "Surname must be present if name is not present" }]
}
/*
Output:
[
{
  "path": [
    "confirm_password"
  ],
  "message": "Passwords do not match"
},
{
  "path": [
    "surname"
  ],
  "message": "Surname must be present if name is not present"
}
]
*/
```

In this example, we define a `MyForm` schema with fields for password validation and optional name/surname fields. The `Schema.makeFilter` function checks if the passwords match and ensures that either a name or surname is provided. If either validation fails, the corresponding error message is associated with the relevant field and both errors are returned in a structured format.

<Aside type="tip" title="Formatting Structured Errors">
  For the other available representations, see [Error
  Formatters](/docs/v4/schema/error-formatters).
</Aside>

## Built-in Filters

### String Filters

Here is a list of useful string filters provided by the Schema module:

```ts twoslash
import { Schema } from "effect"

// Specifies maximum length of a string
Schema.String.check(Schema.isMaxLength(5))

// Specifies minimum length of a string
Schema.String.check(Schema.isMinLength(5))

// Equivalent to isMinLength(1)
Schema.String.check(Schema.isNonEmpty())
// or
Schema.NonEmptyString

// Specifies exact length of a string
Schema.String.check(Schema.isLengthBetween(5, 5))

// Specifies a range for the length of a string
Schema.String.check(Schema.isLengthBetween(2, 4))

// Matches a string against a regular expression pattern
Schema.String.check(Schema.isPattern(/^[a-z]+$/))

// Ensures a string starts with a specific substring
Schema.String.check(Schema.isStartsWith("prefix"))

// Ensures a string ends with a specific substring
Schema.String.check(Schema.isEndsWith("suffix"))

// Checks if a string includes a specific substring
Schema.String.check(Schema.isIncludes("substring"))

// Validates that a string has no leading or trailing whitespaces
Schema.String.check(Schema.isTrimmed())

// Validates that a string is entirely in lowercase
Schema.String.check(Schema.isLowercased())

// Validates that a string is entirely in uppercase
Schema.String.check(Schema.isUppercased())

// Validates that a string is capitalized
Schema.String.check(Schema.isCapitalized())

// Validates that a string is uncapitalized
Schema.String.check(Schema.isUncapitalized())
```

<Aside type="tip" title="Trim vs Trimmed">
  `Schema.isTrimmed` only validates. Use `Schema.Trim` when decoding should
  remove leading and trailing whitespace, or `Schema.Trimmed` when the input
  must already be trimmed.
</Aside>

### Number Filters

Here is a list of useful number filters provided by the Schema module:

```ts twoslash
import { Schema } from "effect"

// Specifies a number greater than 5
Schema.Finite.check(Schema.isGreaterThan(5))

// Specifies a number greater than or equal to 5
Schema.Finite.check(Schema.isGreaterThanOrEqualTo(5))

// Specifies a number less than 5
Schema.Finite.check(Schema.isLessThan(5))

// Specifies a number less than or equal to 5
Schema.Finite.check(Schema.isLessThanOrEqualTo(5))

// Specifies a number between -2 and 2, inclusive
Schema.Finite.check(Schema.isBetween({ minimum: -2, maximum: 2 }))

// Specifies that the value must be an integer
Schema.Finite.check(Schema.isInt())
// or
Schema.Int

// Specifies a positive number (> 0)
Schema.Finite.check(Schema.isGreaterThan(0))

// Specifies a non-negative number (>= 0)
Schema.Finite.check(Schema.isGreaterThanOrEqualTo(0))

// A non-negative integer
Schema.Finite.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0))

// Specifies a negative number (< 0)
Schema.Finite.check(Schema.isLessThan(0))

// Specifies a non-positive number (<= 0)
Schema.Finite.check(Schema.isLessThanOrEqualTo(0))

// Specifies a number that is evenly divisible by 5
Schema.Finite.check(Schema.isMultipleOf(5))

// A 8-bit unsigned integer (0 to 255)
Schema.Finite.check(
  Schema.isInt(),
  Schema.isBetween({ minimum: 0, maximum: 255 }),
)
```

### ReadonlyArray Filters

Here is a list of useful array filters provided by the Schema module:

```ts twoslash
import { Schema } from "effect"

// Specifies the maximum number of items in the array
Schema.Array(Schema.Finite).check(Schema.isMaxLength(2))

// Specifies the minimum number of items in the array
Schema.Array(Schema.Finite).check(Schema.isMinLength(2))

// Specifies the exact number of items in the array
Schema.Array(Schema.Finite).check(Schema.isLengthBetween(2, 2))
```

### Date Filters

```ts twoslash
import { Schema } from "effect"

// Specifies a valid date (rejects values like `new Date("Invalid Date")`)
Schema.Date

// Specifies a date greater than the current date
Schema.Date.check(Schema.isGreaterThanDate(new Date()))

// Specifies a date greater than or equal to the current date
Schema.Date.check(Schema.isGreaterThanOrEqualToDate(new Date()))

// Specifies a date less than the current date
Schema.Date.check(Schema.isLessThanDate(new Date()))

// Specifies a date less than or equal to the current date
Schema.Date.check(Schema.isLessThanOrEqualToDate(new Date()))

// Specifies a date between two dates
Schema.Date.check(
  Schema.isBetweenDate({ minimum: new Date(0), maximum: new Date() }),
)
```

### BigInt Filters

Here is a list of useful `BigInt` filters provided by the Schema module:

```ts twoslash
import { Schema } from "effect"

// Specifies a BigInt greater than 5
Schema.BigInt.check(Schema.isGreaterThanBigInt(5n))

// Specifies a BigInt greater than or equal to 5
Schema.BigInt.check(Schema.isGreaterThanOrEqualToBigInt(5n))

// Specifies a BigInt less than 5
Schema.BigInt.check(Schema.isLessThanBigInt(5n))

// Specifies a BigInt less than or equal to 5
Schema.BigInt.check(Schema.isLessThanOrEqualToBigInt(5n))

// Specifies a BigInt between -2n and 2n, inclusive
Schema.BigInt.check(Schema.isBetweenBigInt({ minimum: -2n, maximum: 2n }))

// Specifies a positive BigInt (> 0n)
Schema.BigInt.check(Schema.isGreaterThanBigInt(0n))

// Specifies a non-negative BigInt (>= 0n)
Schema.BigInt.check(Schema.isGreaterThanOrEqualToBigInt(0n))

// Specifies a negative BigInt (< 0n)
Schema.BigInt.check(Schema.isLessThanBigInt(0n))

// Specifies a non-positive BigInt (<= 0n)
Schema.BigInt.check(Schema.isLessThanOrEqualToBigInt(0n))
```

### BigDecimal Filters

Here is a list of useful `BigDecimal` filters provided by the Schema module:

```ts twoslash
import { Schema, BigDecimal } from "effect"

// Specifies a BigDecimal greater than 5
Schema.BigDecimal.check(
  Schema.isGreaterThanBigDecimal(BigDecimal.fromNumberUnsafe(5)),
)

// Specifies a BigDecimal greater than or equal to 5
Schema.BigDecimal.check(
  Schema.isGreaterThanOrEqualToBigDecimal(BigDecimal.fromNumberUnsafe(5)),
)
// Specifies a BigDecimal less than 5
Schema.BigDecimal.check(
  Schema.isLessThanBigDecimal(BigDecimal.fromNumberUnsafe(5)),
)

// Specifies a BigDecimal less than or equal to 5
Schema.BigDecimal.check(
  Schema.isLessThanOrEqualToBigDecimal(BigDecimal.fromNumberUnsafe(5)),
)

// Specifies a BigDecimal between -2 and 2, inclusive
Schema.BigDecimal.check(
  Schema.isBetweenBigDecimal({
    minimum: BigDecimal.fromNumberUnsafe(-2),
    maximum: BigDecimal.fromNumberUnsafe(2),
  }),
)

// Specifies a positive BigDecimal (> 0)
Schema.BigDecimal.check(
  Schema.isGreaterThanBigDecimal(BigDecimal.fromNumberUnsafe(0)),
)

// Specifies a non-negative BigDecimal (>= 0)
Schema.BigDecimal.check(
  Schema.isGreaterThanOrEqualToBigDecimal(BigDecimal.fromNumberUnsafe(0)),
)

// Specifies a negative BigDecimal (< 0)
Schema.BigDecimal.check(
  Schema.isLessThanBigDecimal(BigDecimal.fromNumberUnsafe(0)),
)

// Specifies a non-positive BigDecimal (<= 0)
Schema.BigDecimal.check(
  Schema.isLessThanOrEqualToBigDecimal(BigDecimal.fromNumberUnsafe(0)),
)
```

### Duration Filters

Here is a list of useful [Duration](/docs/v4/data-types/duration) filters provided by the Schema module:

```ts twoslash
import { Schema, Duration } from "effect"

// Specifies a duration greater than 5 seconds
Schema.Duration.check(
  Schema.makeFilter((d) => Duration.isGreaterThan(d, Duration.seconds(5))),
)

// Specifies a duration greater than or equal to 5 seconds
Schema.Duration.check(
  Schema.makeFilter((d) =>
    Duration.isGreaterThanOrEqualTo(d, Duration.seconds(5)),
  ),
)

// Specifies a duration less than 5 seconds
Schema.Duration.check(
  Schema.makeFilter((d) => Duration.isLessThan(d, Duration.seconds(5))),
)

// Specifies a duration less than or equal to 5 seconds
Schema.Duration.check(
  Schema.makeFilter((d) =>
    Duration.isLessThanOrEqualTo(d, Duration.seconds(5)),
  ),
)

// Specifies a duration between 5 seconds and 10 seconds, inclusive
Schema.Duration.check(
  Schema.makeFilter((d) =>
    Duration.between(d, {
      minimum: Duration.seconds(5),
      maximum: Duration.seconds(10),
    }),
  ),
)
```
