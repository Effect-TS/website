---
title: Error Formatters
description: Format schema issues as readable strings or Standard Schema V1 issue arrays.
sidebar:
  order: 10
---

The `SchemaIssue` module provides two built-in formatters: a human-readable string formatter and a structured Standard Schema V1 formatter.

## Default String Formatter

`SchemaIssue.makeFormatterDefault()` returns a multi-line string. `SchemaError.message` uses this formatter, so most applications can read the message directly from the error.

**Example** (Decoding with Missing Properties)

```ts twoslash import.meta.vitest name="default-string-formatter-1"
import { Result, Schema } from "effect"

const Person = Schema.Struct({
  name: Schema.String,
  age: Schema.Finite,
})

const decode = Schema.decodeUnknownResult(Person)

const result = decode({})
if (Result.isFailure(result)) {
  console.error("Decoding failed:")
  console.error(result.failure.message)
  result.failure.message // => "Missing key\n  at [\"name\"]"
}
/*
Decoding failed:
Missing key
  at ["name"]
*/
```

In this example:

- `["name"]` identifies the specific field causing the error.
- `Missing key` describes the issue.

### Handling Multiple Errors

By default, decoding functions like `Schema.decodeUnknownResult` report only the first error. To list all errors, use the `{ errors: "all" }` option.

**Example** (Listing All Errors)

```ts twoslash import.meta.vitest name="handling-multiple-errors-1"
import { Result, Schema } from "effect"

const Person = Schema.Struct({
  name: Schema.String,
  age: Schema.Finite,
})

const decode = Schema.decodeUnknownResult(Person, { errors: "all" })

const result = decode({})
if (Result.isFailure(result)) {
  console.error("Decoding failed:")
  console.error(result.failure.message)
  result.failure.message // => "Missing key\n  at [\"name\"]\nMissing key\n  at [\"age\"]"
}
/*
Decoding failed:
Missing key
  at ["name"]
Missing key
  at ["age"]
*/
```

## Standard Schema V1 Formatter

`SchemaIssue.makeFormatterStandardSchemaV1()` returns a Standard Schema V1 failure result. Each leaf issue becomes an object with a `message` and a full `path`, making the result convenient for forms and other structured consumers.

**Example** (Single Error in Array Format)

```ts twoslash import.meta.vitest name="standard-schema-formatter-1"
import { Result, Schema, SchemaIssue } from "effect"

const Person = Schema.Struct({
  name: Schema.String,
  age: Schema.Finite,
})

const decode = Schema.decodeUnknownResult(Person)

const result = decode({})
if (Result.isFailure(result)) {
  console.error("Decoding failed:")
  console.error(
    SchemaIssue.makeFormatterStandardSchemaV1()(result.failure.issue).issues,
  )
  SchemaIssue.makeFormatterStandardSchemaV1()(result.failure.issue).issues // => [{ path: ["name"], message: "Missing key" }]
}
/*
Decoding failed:
[ { path: [ 'name' ], message: 'Missing key' } ]
*/
```

In this example:

- `path`: Specifies the location of the error in the data (`['name']`).
- `message`: Describes the issue (`'Missing key'`).

### Handling Multiple Errors

By default, decoding functions like `Schema.decodeUnknownResult` report only the first error. To list all errors, use the `{ errors: "all" }` option.

**Example** (Listing All Errors)

```ts twoslash import.meta.vitest name="handling-multiple-errors-1-2"
import { Result, Schema, SchemaIssue } from "effect"

const Person = Schema.Struct({
  name: Schema.String,
  age: Schema.Finite,
})

const decode = Schema.decodeUnknownResult(Person, { errors: "all" })

const result = decode({})
if (Result.isFailure(result)) {
  console.error("Decoding failed:")
  console.error(
    SchemaIssue.makeFormatterStandardSchemaV1()(result.failure.issue).issues,
  )
  SchemaIssue.makeFormatterStandardSchemaV1()(result.failure.issue).issues // => [{ path: ["name"], message: "Missing key" }, { path: ["age"], message: "Missing key" }]
}
/*
Decoding failed:
[
  { path: [ 'name' ], message: 'Missing key' },
  { path: [ 'age' ], message: 'Missing key' }
]
*/
```

### Customizing Messages

Pass a `leafHook` to customize terminal issues while delegating the remaining cases to `SchemaIssue.defaultLeafHook`.

**Example** (Customizing Missing Key Messages)

```ts twoslash import.meta.vitest name="standard-schema-formatter-custom-message-1"
import { Result, Schema, SchemaIssue } from "effect"

const Person = Schema.Struct({
  name: Schema.String,
})

const formatter = SchemaIssue.makeFormatterStandardSchemaV1({
  leafHook: (issue) =>
    issue._tag === "MissingKey"
      ? "This field is required"
      : SchemaIssue.defaultLeafHook(issue),
})

const result = Schema.decodeUnknownResult(Person)({})
if (Result.isFailure(result)) {
  formatter(result.failure.issue).issues // => [{ path: ["name"], message: "This field is required" }]
}
```

## React Hook Form

If you are working with React, `@hookform/resolvers` provides an `effectTsResolver` adapter for React Hook Form.

See the [`effect-ts` resolver documentation](https://github.com/react-hook-form/resolvers#effect-ts) for setup instructions and an example.
