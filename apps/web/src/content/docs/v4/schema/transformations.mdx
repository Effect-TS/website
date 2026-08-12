---
title: Schema Transformations
description: Transform and manipulate data with schema-based transformations, including type conversions, validations, and custom processing.
sidebar:
  label: Transformations
  order: 7
---

import { Aside } from "@astrojs/starlight/components"

Transformations are important when working with schemas. They allow you to change data from one type to another. For example, you might parse a string into a number or convert a date string into a `Date` object.

Use `Schema.decodeTo` to connect a source schema to a target schema. Provide `SchemaTransformation.transform` for an infallible conversion, or `SchemaGetter.transformOrFail` when either direction may fail or require services.

## Infallible Transformations

`Schema.decodeTo` creates a new schema by connecting the decoded `Type` of a source schema to the `Encoded` type expected by a target schema. `SchemaTransformation.transform` supplies the two infallible conversion functions needed when those types differ.

### Understanding Input and Output

"Output" and "input" depend on what you are doing (decoding or encoding):

**When decoding:**

- The source codec produces `SourceType` from `SourceEncoded`.
- The custom `decode` function converts `SourceType` to `TargetEncoded`.
- The target codec produces `TargetType` from `TargetEncoded`.
- The complete decoding path is `SourceEncoded` → `TargetType`.

If `SourceType` and `TargetEncoded` differ, you can provide a `decode` function to convert the source schema's output into the target schema's input.

**When encoding:**

- The target codec produces `TargetEncoded` from `TargetType`.
- The custom `encode` function converts `TargetEncoded` to `SourceType`.
- The source codec produces `SourceEncoded` from `SourceType`.
- The complete encoding path is `TargetType` → `SourceEncoded`.

If `TargetEncoded` and `SourceType` differ, you can provide an `encode` function to convert the target schema's output into the source schema's input.

### Combining Two Primitive Schemas

In this example, we start with a schema that accepts `"on"` or `"off"` and transform it into a boolean schema. The `decode` function turns `"on"` into `true` and `"off"` into `false`. The `encode` function does the reverse. The resulting codec has `boolean` as its `Type` and `"on" | "off"` as its `Encoded` type.

**Example** (Converting a String to a Boolean)

```ts twoslash import.meta.vitest name="combining-two-primitive-schemas-1"
import { Schema, SchemaTransformation } from "effect"

// Convert "on"/"off" to boolean and back
const BooleanFromString = Schema.Literals(["on", "off"]).pipe(
  Schema.decodeTo(
    // Target schema: boolean
    Schema.Boolean,
    SchemaTransformation.transform({
      // Transformation to convert the output of the
      // source schema ("on" | "off") into the input of the
      // target schema (boolean)
      decode: (literal) => literal === "on", // Always succeeds here
      // Reverse transformation
      encode: (bool) => (bool ? "on" : "off"),
    }),
  ),
)

//     ┌─── "on" | "off"
//     ▼
type Encoded = typeof BooleanFromString.Encoded

//     ┌─── boolean
//     ▼
type Type = typeof BooleanFromString.Type

console.log(Schema.decodeUnknownSync(BooleanFromString)("on"))
// Output: true
```

The `decode` function above never fails by itself. However, the full decoding process can still fail if the input does not fit the source schema. For example, if you provide `"wrong"` instead of `"on"` or `"off"`, the source schema will fail before calling `decode`.

**Example** (Handling Invalid Input)

```ts twoslash collapse={4-12}
import { Schema, SchemaTransformation } from "effect"

// Convert "on"/"off" to boolean and back
const BooleanFromString = Schema.Literals(["on", "off"]).pipe(
  Schema.decodeTo(
    Schema.Boolean,
    SchemaTransformation.transform({
      decode: (s) => s === "on",
      encode: (bool) => (bool ? "on" : "off"),
    }),
  ),
)

// Providing input not allowed by the source schema
Schema.decodeUnknownSync(BooleanFromString)("wrong")
/*
throws:
SchemaError: Expected "on" | "off"
*/
```

### Combining Two Transformation Schemas

Below is an example where both the source and target schemas transform their data:

- The source schema is `Schema.FiniteFromString`, whose `Type` is `number` and whose `Encoded` type is `string`.
- The target schema is `BooleanFromString`, whose `Type` is `boolean` and whose `Encoded` type is `"on" | "off"`.

This example involves four types and requires two conversions:

- When decoding, convert a `number` into `"on" | "off"`. For example, treat any positive number as `"on"`.
- When encoding, convert `"on" | "off"` back into a `number`. For example, treat `"on"` as `1` and `"off"` as `-1`.

By composing these transformations, we get a codec whose `Type` is `boolean` and whose `Encoded` type is `string`.

**Example** (Combining Two Transformation Schemas)

```ts twoslash collapse={4-12} import.meta.vitest name="combining-two-transformation-schemas-1"
import { Schema, SchemaTransformation } from "effect"

// Convert "on"/"off" to boolean and back
const BooleanFromString = Schema.Literals(["on", "off"]).pipe(
  Schema.decodeTo(
    Schema.Boolean,
    SchemaTransformation.transform({
      decode: (s) => s === "on",
      encode: (bool) => (bool ? "on" : "off"),
    }),
  ),
)

const BooleanFromNumericString = Schema.FiniteFromString.pipe(
  Schema.decodeTo(
    // Target schema: Convert "on"/"off" -> boolean
    BooleanFromString,
    SchemaTransformation.transform({
      // If number is positive, use "on", otherwise "off"
      decode: (n) => (n > 0 ? "on" : "off"),
      // If boolean is "on", use 1, otherwise -1
      encode: (bool) => (bool === "on" ? 1 : -1),
    }),
  ),
)

//     ┌─── string
//     ▼
type Encoded = typeof BooleanFromNumericString.Encoded

//     ┌─── boolean
//     ▼
type Type = typeof BooleanFromNumericString.Type

console.log(Schema.decodeUnknownSync(BooleanFromNumericString)("100"))
// Output: true
```

**Example** (Converting an array to a ReadonlySet)

In this example, we convert an array into a `ReadonlySet`. The `decode` function takes an array and creates a new `ReadonlySet`. The `encode` function converts the set back into an array. We also provide the schema of the array items so they are properly validated.

```ts twoslash import.meta.vitest name="combining-two-transformation-schemas-2"
import { Schema, SchemaTransformation } from "effect"

// This function builds a schema that converts between a readonly array
// and a readonly set of items
const ReadonlySetFromArray = <S extends Schema.Constraint>(itemSchema: S) =>
  Schema.Array(itemSchema).pipe(
    Schema.decodeTo(
      // Target schema: readonly set of items
      // **IMPORTANT** We use `Schema.toType` here to obtain the schema
      // of the items to avoid decoding the elements twice
      Schema.ReadonlySet(Schema.toType(itemSchema)),
      SchemaTransformation.transform({
        decode: (items: ReadonlyArray<S["Type"]>): ReadonlySet<S["Type"]> =>
          new Set(items),
        encode: (set: ReadonlySet<S["Type"]>): ReadonlyArray<S["Type"]> =>
          Array.from(set.values()),
      }),
    ),
  )

const schema = ReadonlySetFromArray(Schema.String)

//     ┌─── readonly string[]
//     ▼
type Encoded = typeof schema.Encoded

//     ┌─── ReadonlySet<string>
//     ▼
type Type = typeof schema.Type

console.log(Schema.decodeUnknownSync(schema)(["a", "b", "c"]))
// Output: Set(3) { 'a', 'b', 'c' }

console.log(Schema.encodeSync(schema)(new Set(["a", "b", "c"])))
// Output: [ 'a', 'b', 'c' ]

Schema.encodeSync(schema)(new Set(["a", "b", "c"])) // => ["a", "b", "c"]
```

<Aside type="note" title="Why Schema.toType is used">
  Please note that to define the target schema, we used
  [Schema.toType](/docs/v4/schema/projections#totype). This is because the
  decoding/encoding of the elements is already handled by the `from` schema:
  `Schema.Array(itemSchema)`, avoiding double decoding.
</Aside>

## Fallible Transformations

Use `SchemaGetter.transformOrFail` inside `Schema.decodeTo` when decoding or encoding can fail, run asynchronously, or require Effect services.

This function enables decoding/encoding functions to return either a successful result or an error,
making it particularly useful for validating and processing data that might not always conform to expected formats.

### Error Handling

The getter returns an `Effect` that succeeds with the converted value or fails with a `SchemaIssue.Issue`. Use a specific issue such as `SchemaIssue.InvalidValue`, `Pointer`, or `Composite` when you need structured error information.

**Example** (Normalizing a Color Name)

A transformation can normalize a broader input and report a domain-specific issue when no target value matches.

```ts twoslash
import { Effect, Schema, SchemaGetter, SchemaIssue } from "effect"

const Color = Schema.Literals(["red", "green", "blue"])

export const ColorFromString = Schema.String.pipe(
  Schema.decodeTo(Color, {
    decode: SchemaGetter.transformOrFail((input) => {
      const normalized = input.toLowerCase()
      if (
        normalized === "red" ||
        normalized === "green" ||
        normalized === "blue"
      ) {
        return Effect.succeed(normalized)
      }
      return Effect.fail(
        new SchemaIssue.InvalidValue({ message: "Unsupported color" }),
      )
    }),
    encode: SchemaGetter.passthrough(),
  }),
)

//     ┌─── string
//     ▼
type Encoded = typeof ColorFromString.Encoded

//     ┌─── "red" | "green" | "blue"
//     ▼
type Type = typeof ColorFromString.Type

console.log(Schema.decodeUnknownSync(ColorFromString)("RED"))
// Output: "red"

console.log(Schema.decodeUnknownSync(ColorFromString)("yellow"))
/*
throws:
SchemaError: Unsupported color
*/
```

The function passed to `SchemaGetter.transformOrFail` receives the value and the active [parse options](/docs/v4/schema/getting-started#parse-options).

### Async Transformations

In modern applications, especially those interacting with external APIs, you might need to transform data asynchronously. `SchemaGetter.transformOrFail` supports this by returning an `Effect`.

**Example** (Validating Data with an API Call)

Consider a scenario where you need to validate a person's ID by making an API call. Here's how you can implement it:

```ts twoslash
import { Effect, Schema, SchemaGetter, SchemaIssue } from "effect"

// Define a function to make API requests
const get = (url: string): Effect.Effect<unknown, Error> =>
  Effect.tryPromise({
    try: () =>
      fetch(url).then((res) => {
        if (res.ok) {
          return res.json() as Promise<unknown>
        }
        throw new Error(String(res.status))
      }),
    catch: (e) => new Error(String(e)),
  })

// Create a branded schema for a person's ID
const PeopleId = Schema.String.pipe(Schema.brand("PeopleId"))

// Define a schema with async transformation
const PeopleIdFromString = Schema.String.pipe(
  Schema.decodeTo(PeopleId, {
    decode: SchemaGetter.transformOrFail((s) =>
      // Make an API call to validate the ID
      Effect.mapBoth(get(`https://swapi.dev/api/people/${s}`), {
        // Error handling for failed API call
        onFailure: (e) => new SchemaIssue.InvalidValue({ message: e.message }),
        // Return the ID if the API call succeeds
        onSuccess: () => s,
      }),
    ),
    encode: SchemaGetter.passthrough(),
  }),
)

//     ┌─── string
//     ▼
type Encoded = typeof PeopleIdFromString.Encoded

//     ┌─── string & Brand<"PeopleId">
//     ▼
type Type = typeof PeopleIdFromString.Type

//     ┌─── never
//     ▼
type DecodingServices = typeof PeopleIdFromString.DecodingServices

// Run a successful decode operation
Effect.runPromiseExit(Schema.decodeUnknownEffect(PeopleIdFromString)("1")).then(
  console.log,
)
/*
Output:
{ _id: 'Exit', _tag: 'Success', value: '1' }
*/

// Run a decode operation that will fail
Effect.runPromiseExit(
  Schema.decodeUnknownEffect(PeopleIdFromString)("fail"),
).then(console.log)
/*
Output:
{
  _id: 'Exit',
  _tag: 'Failure',
  cause: { _id: 'Cause', failures: [ [Object] ] }
}
*/
```

### Declaring Dependencies

When a transformation depends on services, they are tracked separately in the codec's `DecodingServices` and `EncodingServices` views.

```text showLineNumbers=false
Codec<T, E, RD, RE>
```

**Example** (Validating Data with a Service)

```ts twoslash
import {
  Context,
  Effect,
  Schema,
  SchemaGetter,
  SchemaIssue,
  Layer,
} from "effect"

// Define a Validation service for dependency injection
class Validation extends Context.Service<
  Validation,
  {
    readonly validatePeopleid: (s: string) => Effect.Effect<void, Error>
  }
>()("Validation") {}

// Create a branded schema for a person's ID
const PeopleId = Schema.String.pipe(Schema.brand("PeopleId"))

// Transform a string into a validated PeopleId,
// using an external validation service
const PeopleIdFromString = Schema.String.pipe(
  Schema.decodeTo(PeopleId, {
    decode: SchemaGetter.transformOrFail((s) =>
      // Asynchronously validate the ID using the injected service
      Effect.gen(function* () {
        // Access the validation service
        const validator = yield* Validation
        // Use service to validate ID
        yield* validator.validatePeopleid(s)
        return s
      }).pipe(
        Effect.mapError(
          (e) => new SchemaIssue.InvalidValue({ message: e.message }),
        ),
      ),
    ),
    encode: SchemaGetter.passthrough(), // Encode by simply returning the string
  }),
)

//     ┌─── string
//     ▼
type Encoded = typeof PeopleIdFromString.Encoded

//     ┌─── string & Brand<"PeopleId">
//     ▼
type Type = typeof PeopleIdFromString.Type

//     ┌─── Validation
//     ▼
type DecodingServices = typeof PeopleIdFromString.DecodingServices

// Layer to provide a successful validation service
const SuccessTest = Layer.succeed(Validation, {
  validatePeopleid: (_) => Effect.void,
})

// Run a successful decode operation
Effect.runPromiseExit(
  Schema.decodeUnknownEffect(PeopleIdFromString)("1").pipe(
    Effect.provide(SuccessTest),
  ),
).then(console.log)
/*
Output:
{ _id: 'Exit', _tag: 'Success', value: '1' }
*/

// Layer to provide a failing validation service
const FailureTest = Layer.succeed(Validation, {
  validatePeopleid: (_) => Effect.fail(new Error("404")),
})

// Run a decode operation that will fail
Effect.runPromiseExit(
  Schema.decodeUnknownEffect(PeopleIdFromString)("fail").pipe(
    Effect.provide(FailureTest),
  ),
).then(console.log)
/*
Output:
{
  _id: 'Exit',
  _tag: 'Failure',
  cause: { _id: 'Cause', failures: [ [Object] ] }
}
*/
```

## One-Way Transformations with Forbidden Encoding

In some cases, encoding a value back to its original form may not make sense or may be undesirable. Use `SchemaGetter.forbidden` for that direction so the restriction is represented as a schema issue.

**Example** (Content Digest with Forbidden Encoding)

Computing a digest loses the original content. This transformation decodes text to its SHA-256 digest and explicitly forbids encoding the digest back to the source text.

```ts twoslash
import { Schema, SchemaGetter } from "effect"
import { createHash } from "node:crypto"

const Content = Schema.String

const Sha256Digest = Schema.String.pipe(Schema.brand("Sha256Digest"))

export const ContentDigest = Content.pipe(
  Schema.decodeTo(Sha256Digest, {
    decode: SchemaGetter.transform((content) =>
      createHash("sha256").update(content).digest("hex"),
    ),
    encode: SchemaGetter.forbidden(
      () => "A SHA-256 digest cannot be encoded as its source.",
    ),
  }),
)

//     ┌─── string
//     ▼
type Encoded = typeof ContentDigest.Encoded

//     ┌─── string & Brand<"Sha256Digest">
//     ▼
type Type = typeof ContentDigest.Type

console.log(Schema.decodeUnknownSync(ContentDigest)("hello"))
// Output: "2cf24dba5fb0a30e..."

Schema.encodeUnknownSync(ContentDigest)("2cf24dba5fb0a30e...")
/*
throws:
SchemaError: A SHA-256 digest cannot be encoded as its source.
*/
```

## Composition

When the source codec's `Type` already matches the target codec's `Encoded` type, call `Schema.decodeTo` without a custom transformation. The result combines both decoding paths and both encoding paths.

**Example** (Composing Schemas to Parse a Delimited String into Numbers)

```ts twoslash
import { Schema, SchemaTransformation } from "effect"

// Schema to split a string by commas into an array of strings
const split = (separator: string) =>
  Schema.String.pipe(
    Schema.decodeTo(
      Schema.Array(Schema.String),
      SchemaTransformation.transform({
        decode: (value): ReadonlyArray<string> => value.split(separator),
        encode: (values) => values.join(separator),
      }),
    ),
  )

// Schema to convert an array of strings to an array of numbers
const FiniteArrayFromStringArray = Schema.Array(Schema.FiniteFromString)

// Composed schema that takes a string, splits it by commas,
// and converts the result into an array of numbers
const ComposedSchema = split(",").pipe(
  Schema.decodeTo(FiniteArrayFromStringArray),
)

Schema.decodeUnknownSync(ComposedSchema)("1,2,3") // => [1, 2, 3]
```

## Effectful Filters

Use `SchemaGetter.checkEffect` as part of a transformation for validations that require asynchronous work or services. For synchronous validation, use [filters](/docs/v4/schema/filters#declaring-filters).

**Example** (Asynchronous Username Validation)

```ts twoslash
import { Effect, Schema, SchemaGetter } from "effect"

// Mock async function to validate a username
async function validateUsername(username: string) {
  return Promise.resolve(username === "gcanti")
}

// Define a schema with an effectful filter
const ValidUsername = Schema.String.pipe(
  Schema.decode({
    decode: SchemaGetter.checkEffect((username) =>
      Effect.promise(() =>
        // Validate the username asynchronously,
        // returning an error message if invalid
        validateUsername(username).then((valid) => valid || "Invalid username"),
      ),
    ),
    encode: SchemaGetter.passthrough(),
  }),
).annotate({ identifier: "ValidUsername" })

Effect.runPromise(Schema.decodeUnknownEffect(ValidUsername)("xxx")).then(
  console.log,
)
/*
throws:
SchemaError: Invalid username
*/
```

## String Transformations

### split

Splits a string by a specified delimiter into an array of substrings.

**Example** (Splitting a String by Comma)

```ts twoslash import.meta.vitest name="split-1"
import { Schema, SchemaTransformation } from "effect"

function split(separator: string) {
  return Schema.String.pipe(
    Schema.decodeTo(
      Schema.Array(Schema.String),
      SchemaTransformation.transform({
        decode: (s) => s.split(separator) as ReadonlyArray<string>,
        encode: (as) => as.join(separator),
      }),
    ),
  )
}

const schema = split(",")

const decode = Schema.decodeUnknownSync(schema)

console.log(decode("")) // [""]
console.log(decode(",")) // ["", ""]
console.log(decode("a,")) // ["a", ""]
console.log(decode("a,b")) // ["a", "b"]

decode("a,b") // => ["a", "b"]
```

### Trim

Removes whitespace from the beginning and end of a string.

**Example** (Trimming Whitespace)

```ts twoslash import.meta.vitest name="trim-1"
import { Schema } from "effect"

const decode = Schema.decodeUnknownSync(Schema.Trim)

console.log(decode("a")) // "a"
console.log(decode(" a")) // "a"
console.log(decode("a ")) // "a"
console.log(decode(" a ")) // "a"

decode(" a ") // => "a"
```

<Aside type="tip" title="Trimmed Check">
  If you were looking for a combinator to check if a string is trimmed, check
  out the `Schema.isTrimmed` filter.
</Aside>

### Lowercase

Converts a string to lowercase.

**Example** (Converting to Lowercase)

```ts twoslash import.meta.vitest name="lowercase-1"
import { Schema, SchemaTransformation } from "effect"

const decode = Schema.decodeUnknownSync(
  Schema.String.pipe(
    Schema.decodeTo(
      Schema.String.check(Schema.isLowercased()),
      SchemaTransformation.toLowerCase(),
    ),
  ),
)

console.log(decode("A")) // "a"
console.log(decode(" AB")) // " ab"
console.log(decode("Ab ")) // "ab "
console.log(decode(" ABc ")) // " abc "

decode("A") // => "a"
```

<Aside type="tip" title="Lowercase And Lowercased">
  To validate without transforming, use
  `Schema.String.check(Schema.isLowercased())`.
</Aside>

### Uppercase

Converts a string to uppercase.

**Example** (Converting to Uppercase)

```ts twoslash import.meta.vitest name="uppercase-1"
import { Schema, SchemaTransformation } from "effect"

const decode = Schema.decodeUnknownSync(
  Schema.String.pipe(
    Schema.decodeTo(
      Schema.String.check(Schema.isUppercased()),
      SchemaTransformation.toUpperCase(),
    ),
  ),
)

console.log(decode("a")) // "A"
console.log(decode(" ab")) // " AB"
console.log(decode("aB ")) // "AB "
console.log(decode(" abC ")) // " ABC "

decode("a") // => "A"
```

<Aside type="tip" title="Uppercase And Uppercased">
  To validate without transforming, use
  `Schema.String.check(Schema.isUppercased())`.
</Aside>

### Capitalize

Converts the first character of a string to uppercase.

**Example** (Capitalizing a String)

```ts twoslash import.meta.vitest name="capitalize-1"
import { Schema, SchemaTransformation } from "effect"

const decode = Schema.decodeUnknownSync(
  Schema.String.pipe(
    Schema.decodeTo(
      Schema.String.check(Schema.isCapitalized()),
      SchemaTransformation.capitalize(),
    ),
  ),
)

console.log(decode("aa")) // "Aa"
console.log(decode(" ab")) // " ab"
console.log(decode("aB ")) // "AB "
console.log(decode(" abC ")) // " abC "

decode("aa") // => "Aa"
```

<Aside type="tip" title="Capitalize And Capitalized">
  To validate without transforming, use
  `Schema.String.check(Schema.isCapitalized())`.
</Aside>

### Uncapitalize

Converts the first character of a string to lowercase.

**Example** (Uncapitalizing a String)

```ts twoslash import.meta.vitest name="uncapitalize-1"
import { Schema, SchemaTransformation } from "effect"

const decode = Schema.decodeUnknownSync(
  Schema.String.pipe(
    Schema.decodeTo(
      Schema.String.check(Schema.isUncapitalized()),
      SchemaTransformation.uncapitalize(),
    ),
  ),
)

console.log(decode("AA")) // "aA"
console.log(decode(" AB")) // " AB"
console.log(decode("Ab ")) // "ab "
console.log(decode(" AbC ")) // " AbC "

decode("AA") // => "aA"
```

<Aside type="tip" title="Uncapitalize And Uncapitalized">
  To validate without transforming, use
  `Schema.String.check(Schema.isUncapitalized())`.
</Aside>

### JSON Strings

`Schema.fromJsonString` creates a schema that decodes JSON text with `JSON.parse` and encodes values with `JSON.stringify`. Use `Schema.Unknown` when the parsed value can have any JSON-compatible shape.

**Example** (Parsing JSON Strings)

```ts twoslash
import { Schema } from "effect"

const schema = Schema.fromJsonString(Schema.Unknown)
const decode = Schema.decodeUnknownSync(schema)

// Parse valid JSON strings
console.log(decode("{}")) // Output: {}
console.log(decode(`{"a":"b"}`)) // Output: { a: "b" }

// Attempting to decode an empty string results in an error
decode("")
/*
throws:
SchemaError: Expected a valid JSON string
*/
```

Pass a more specific schema to validate the parsed value.

**Example** (Parsing JSON with Structured Validation)

In this example, the struct ensures the parsed JSON is an object with a finite numeric property `a`.

```ts twoslash import.meta.vitest name="parsejson-1"
import { Schema } from "effect"

const schema = Schema.fromJsonString(Schema.Struct({ a: Schema.Finite }))
```

### StringFromBase64

Decodes a base64 (RFC4648) encoded string into a UTF-8 string.

**Example** (Decoding Base64)

```ts twoslash import.meta.vitest name="stringfrombase64-1"
import { Schema } from "effect"

const decode = Schema.decodeUnknownSync(Schema.StringFromBase64)

console.log(decode("Zm9vYmFy"))
// Output: "foobar"

decode("Zm9vYmFy") // => "foobar"
```

### StringFromBase64Url

Decodes a base64 (URL) encoded string into a UTF-8 string.

**Example** (Decoding Base64 URL)

```ts twoslash import.meta.vitest name="stringfrombase64url-1"
import { Schema } from "effect"

const decode = Schema.decodeUnknownSync(Schema.StringFromBase64Url)

console.log(decode("Zm9vYmFy"))
// Output: "foobar"

decode("Zm9vYmFy") // => "foobar"
```

### StringFromHex

Decodes a hex encoded string into a UTF-8 string.

**Example** (Decoding Hex String)

```ts twoslash import.meta.vitest name="stringfromhex-1"
import { Schema } from "effect"

const decode = Schema.decodeUnknownSync(Schema.StringFromHex)

console.log(new TextEncoder().encode(decode("0001020304050607")))
/*
Output:
Uint8Array(8) [
  0, 1, 2, 3,
  4, 5, 6, 7
]
*/
```

### StringFromUriComponent

Decodes a URI-encoded string into a UTF-8 string. It is useful for encoding and decoding data in URLs.

**Example** (Decoding URI Component)

```ts twoslash
import { Schema } from "effect"

const PaginationSchema = Schema.Struct({
  maxItemPerPage: Schema.Finite,
  page: Schema.Finite,
})

const UrlSchema = Schema.StringFromUriComponent.pipe(
  Schema.decodeTo(Schema.fromJsonString(PaginationSchema)),
)

console.log(Schema.encodeSync(UrlSchema)({ maxItemPerPage: 10, page: 1 }))
// Output: %7B%22maxItemPerPage%22%3A10%2C%22page%22%3A1%7D
```

## Number Transformations

### FiniteFromString

Transforms a string into a finite number.

It returns an error if the value can't be converted or represents a non-finite number such as `NaN`, `Infinity`, or `-Infinity`.

**Example** (Parsing a Finite Number from a String)

```ts twoslash import.meta.vitest name="finitefromstring-1"
import { Schema } from "effect"

const schema = Schema.FiniteFromString

const decode = Schema.decodeUnknownSync(schema)

// success cases
console.log(decode("1")) // 1
console.log(decode("-1")) // -1
console.log(decode("1.5")) // 1.5

decode("1") // => 1
```

## BigInt transformations

### BigIntFromString

Converts a string to a `BigInt` using the `BigInt` constructor.

**Example** (Parsing BigInt from String)

```ts twoslash
import { Schema } from "effect"

const decode = Schema.decodeUnknownSync(Schema.BigIntFromString)

// success cases
console.log(decode("1")) // 1n
console.log(decode("-1")) // -1n

// failure cases
decode("a")
/*
throws:
SchemaError: Expected a string representing a bigint
*/
decode("1.5") // throws
decode("NaN") // throws
decode("Infinity") // throws
decode("-Infinity") // throws
```

## Date transformations

### DateFromString

Converts a string into a **valid** `Date`, ensuring that invalid dates, such as `new Date("Invalid Date")`, are rejected.

**Example** (Parsing and Validating Date)

```ts twoslash
import { Schema } from "effect"

const decode = Schema.decodeUnknownSync(Schema.DateFromString)

console.log(decode("1970-01-01T00:00:00.000Z"))
// Output: 1970-01-01T00:00:00.000Z

decode("a")
/*
throws:
SchemaError: Expected a valid Date
*/

const decodeDate = Schema.decodeSync(Schema.Date)

console.log(decodeDate(new Date(0)))
// Output: 1970-01-01T00:00:00.000Z

console.log(decodeDate(new Date("Invalid Date")))
/*
throws:
SchemaError: Expected a valid Date
*/
```

## BigDecimal Transformations

### BigDecimalFromString

Converts a string to a `BigDecimal`.

**Example** (Parsing BigDecimal from String)

```ts twoslash import.meta.vitest name="bigdecimal-1"
import { Schema } from "effect"

const decode = Schema.decodeUnknownSync(Schema.BigDecimalFromString)

console.log(decode(".124"))
// Output: { _id: 'BigDecimal', value: '124', scale: 3 }
```
