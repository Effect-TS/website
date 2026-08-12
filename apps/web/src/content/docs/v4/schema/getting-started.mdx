---
title: Getting Started
description: Learn how to define schemas, extract types, and handle decoding and encoding.
sidebar:
  order: 2
---

import { Aside } from "@astrojs/starlight/components"

You can import the necessary types and functions from the `effect/Schema` module:

**Example** (Namespace Import)

```ts showLineNumbers=false import.meta.vitest name="getting-started-1"
import * as Schema from "effect/Schema"
```

**Example** (Named Import)

```ts showLineNumbers=false import.meta.vitest name="getting-started-2"
import { Schema } from "effect"
```

## Defining a schema

One common way to define a `Schema` is by utilizing the `Struct` constructor.
This constructor allows you to create a new schema that outlines an object with specific properties.
Each property in the object is defined by its own schema, which specifies the data type and any validation rules.

**Example** (Defining a Simple Object Schema)

This `Person` schema describes an object with a `name` (string) and `age` (number) property:

```ts twoslash import.meta.vitest name="defining-a-schema-1"
import { Schema } from "effect"

const Person = Schema.Struct({
  name: Schema.String,
  age: Schema.Finite,
})
```

## Extracting Inferred Types

### Type

Once you've defined a schema, you can extract its inferred decoded type `T` in two ways:

1. Using the `Schema.Schema.Type` utility
2. Accessing the `Type` field directly on the schema

**Example** (Extracting Inferred Type)

```ts twoslash import.meta.vitest name="type-1"
import { Schema } from "effect"

const Person = Schema.Struct({
  name: Schema.String,
  age: Schema.Finite,
})

// 1. Using the Schema.Schema.Type utility
type Person = Schema.Schema.Type<typeof Person>

// 2. Accessing the Type field directly
type Person2 = typeof Person.Type
```

The resulting type will look like this:

```ts showLineNumbers=false
type Person = {
  readonly name: string
  readonly age: number
}
```

Alternatively, you can extract the `Person` type using the `interface` keyword, which may improve readability and performance in some cases.

**Example** (Extracting Type with an Interface)

```ts twoslash import.meta.vitest name="type-2"
import { Schema } from "effect"

const Person = Schema.Struct({
  name: Schema.String,
  age: Schema.Finite,
})

interface Person extends Schema.Schema.Type<typeof Person> {}
```

Both approaches yield the same result, but using an interface provides benefits such as performance advantages and improved readability.

### Encoded

For a schema viewed as a `Codec<T, E, RD, RE>`, the encoded type `E` can differ from the decoded type `T`. You can extract the encoded type in two ways:

1. Using the `Schema.Codec.Encoded` utility
2. Accessing the `Encoded` field directly on the schema

**Example** (Extracting the Encoded Type)

```ts twoslash import.meta.vitest name="encoded-1"
import { Schema } from "effect"

const Person = Schema.Struct({
  name: Schema.String,
  // a schema that decodes a string to a number
  age: Schema.FiniteFromString,
})

// 1. Using the Schema.Codec.Encoded utility
type PersonEncoded = Schema.Codec.Encoded<typeof Person>

// 2. Accessing the Encoded field directly
type PersonEncoded2 = typeof Person.Encoded
```

The resulting type is:

```ts showLineNumbers=false
type PersonEncoded = {
  readonly name: string
  readonly age: string
}
```

Note that `age` is of type `string` in the `Encoded` type of the schema and is of type `number` in the `Type` type of the schema.

Alternatively, you can define the `PersonEncoded` type using the `interface` keyword, which can enhance readability and performance.

**Example** (Extracting Encoded Type with an Interface)

```ts twoslash import.meta.vitest name="encoded-2"
import { Schema } from "effect"

const Person = Schema.Struct({
  name: Schema.String,
  // a schema that decodes a string to a number
  age: Schema.FiniteFromString,
})

interface PersonEncoded extends Schema.Codec.Encoded<typeof Person> {}
```

Both approaches yield the same result, but using an interface provides benefits such as performance advantages and improved readability.

### Services

A `Codec<T, E, RD, RE>` tracks its service requirements separately in each direction: `RD` contains the services required for decoding, while `RE` contains those required for encoding. You can extract both types in two ways:

1. Using the `Schema.Codec.DecodingServices` and `Schema.Codec.EncodingServices` utilities.
2. Accessing the `DecodingServices` and `EncodingServices` fields directly on the schema.

**Example** (Extracting the Service Requirements)

```ts twoslash import.meta.vitest name="services-1"
import { Schema } from "effect"

const Person = Schema.Struct({
  name: Schema.String,
  age: Schema.Finite,
})

// 1. Using the Schema.Codec.DecodingServices / EncodingServices utilities
type PersonDecodingServices = Schema.Codec.DecodingServices<typeof Person>
type PersonEncodingServices = Schema.Codec.EncodingServices<typeof Person>

// 2. Accessing the DecodingServices / EncodingServices field directly
type PersonDecodingServices2 = typeof Person.DecodingServices
type PersonEncodingServices2 = typeof Person.EncodingServices
```

## Readonly Types by Default

It's important to note that by default, most constructors exported by
`effect/Schema` return `readonly` types.

**Example** (Readonly Types in a Schema)

For instance, in the `Person` schema below:

```ts twoslash import.meta.vitest name="readonly-types-by-default-1"
import { Schema } from "effect"

const Person = Schema.Struct({
  name: Schema.String,
  age: Schema.Finite,
})
```

the resulting inferred `Type` would be:

```ts showLineNumbers=false "readonly"
{
  readonly name: string;
  readonly age: number;
}
```

## Decoding

When working with unknown data types in TypeScript, decoding them into a known structure can be challenging. Luckily, `effect/Schema` provides several functions to help with this process. Let's explore how to decode unknown values using these functions.

| API                    | Description                                                                        |
| ---------------------- | ---------------------------------------------------------------------------------- |
| `decodeUnknownSync`    | Synchronously decodes a value and throws an error if parsing fails.                |
| `decodeUnknownExit`    | Decodes a value and returns an [Exit](/docs/v4/data-types/exit).                   |
| `decodeUnknownOption`  | Decodes a value and returns an [Option](/docs/v4/data-types/option) type.          |
| `decodeUnknownResult`  | Decodes a value and returns a [Result](/docs/v4/data-types/result) type.           |
| `decodeUnknownPromise` | Decodes a value and returns a `Promise`.                                           |
| `decodeUnknownEffect`  | Decodes a value and returns an [Effect](/docs/v4/getting-started/the-effect-type). |

### decodeUnknownSync

The `Schema.decodeUnknownSync` function is useful when you want to parse a value and immediately throw an error if the parsing fails.

**Example** (Using `decodeUnknownSync` for Immediate Decoding)

```ts twoslash
import { Schema } from "effect"

const Person = Schema.Struct({
  name: Schema.String,
  age: Schema.Finite,
})

// Simulate an unknown input
const input: unknown = { name: "Alice", age: 30 }

// Example of valid input matching the schema
console.log(Schema.decodeUnknownSync(Person)(input))
// Output: { name: 'Alice', age: 30 }

// Example of invalid input that does not match the schema
console.log(Schema.decodeUnknownSync(Person)(null))
/*
throws:
SchemaError: Expected object
*/
```

### decodeUnknownResult

The `Schema.decodeUnknownResult` function allows you to parse a value and receive the result as a [Result](/docs/v4/data-types/result), representing success (`Success`) or failure (`Failure`). This approach lets you handle parsing errors more gracefully without throwing exceptions.

**Example** (Using `Schema.decodeUnknownResult` for Error Handling)

```ts twoslash import.meta.vitest name="decodeunknownresult-1"
import { Result, Schema } from "effect"

const Person = Schema.Struct({
  name: Schema.String,
  age: Schema.Finite,
})

const decode = Schema.decodeUnknownResult(Person)

// Simulate an unknown input
const input: unknown = { name: "Alice", age: 30 }

// Attempt decoding a valid input
const result1 = decode(input) // => Result.succeed({ name: "Alice", age: 30 })
if (Result.isSuccess(result1)) {
  console.log(result1.success)
  // Output: { name: 'Alice', age: 30 }
}

// Simulate decoding an invalid input
const result2 = decode(null)
if (Result.isFailure(result2)) {
  console.log(result2.failure.message)
  // Output: Expected object
}
```

### decodeUnknownEffect

If a schema contains asynchronous transformations, the `Sync`, `Option`, `Result`, and `Exit` interpreters cannot execute them. Use `Schema.decodeUnknownEffect` or `Schema.decodeUnknownPromise` instead.

**Example** (Handling Asynchronous Decoding)

```ts twoslash
import { Effect, Schema, SchemaGetter } from "effect"

const PersonId = Schema.Finite

const Person = Schema.Struct({
  id: PersonId,
  name: Schema.String,
  age: Schema.Finite,
})

const asyncSchema = PersonId.pipe(
  Schema.decodeTo(Person, {
    // Decode with simulated async transformation
    decode: SchemaGetter.transformOrFail((id) =>
      Effect.succeed({ id, name: "name", age: 18 }).pipe(
        Effect.delay("10 millis"),
      ),
    ),
    encode: SchemaGetter.transformOrFail((person) =>
      Effect.succeed(person.id).pipe(Effect.delay("10 millis")),
    ),
  }),
)

// Attempting to use a synchronous decoder on an async schema
console.log(Schema.decodeUnknownExit(asyncSchema)(1))
/*
Output:
{
  _id: 'Exit',
  _tag: 'Failure',
  cause: { _id: 'Cause', failures: [ [Object] ] }
}
*/

// Decoding asynchronously with `Schema.decodeUnknownEffect`
Effect.runPromise(Schema.decodeUnknownEffect(asyncSchema)(1)).then(console.log)
/*
Output:
{ id: 1, name: 'name', age: 18 }
*/
```

In the code above, the first approach using `Schema.decodeUnknownExit` results in an error indicating that the transformation cannot be resolved synchronously.
This occurs because `Schema.decodeUnknownExit` is not designed for async operations.
The second approach, which uses `Schema.decodeUnknownEffect`, works correctly, allowing you to handle asynchronous transformations and return the expected result.

## Encoding

The `Schema` module provides several `encode*` functions to encode data according to a schema:

| API             | Description                                                                                           |
| --------------- | ----------------------------------------------------------------------------------------------------- |
| `encodeSync`    | Synchronously encodes data and throws an error if encoding fails.                                     |
| `encodeExit`    | Encodes data and returns an [Exit](/docs/v4/data-types/exit).                                         |
| `encodeOption`  | Encodes data and returns an [Option](/docs/v4/data-types/option) type.                                |
| `encodeResult`  | Encodes data and returns a [Result](/docs/v4/data-types/result) type representing success or failure. |
| `encodePromise` | Encodes data and returns a `Promise`.                                                                 |
| `encodeEffect`  | Encodes data and returns an [Effect](/docs/v4/getting-started/the-effect-type).                       |

**Example** (Using `Schema.encodeSync` for Immediate Encoding)

```ts twoslash
import { Schema } from "effect"

const Person = Schema.Struct({
  // Ensure name is a non-empty string
  name: Schema.NonEmptyString,
  // Allow age to be decoded from a string and encoded to a string
  age: Schema.FiniteFromString,
})

// Valid input: encoding succeeds and returns expected types
console.log(Schema.encodeSync(Person)({ name: "Alice", age: 30 }))
// Output: { name: 'Alice', age: '30' }

// Invalid input: encoding fails due to empty name string
console.log(Schema.encodeSync(Person)({ name: "", age: 30 }))
/*
throws:
SchemaError: Expected a value with a length of at least 1
  at ["name"]
*/
```

Note that during encoding, the number value `30` was converted to a string `"30"`.

## SchemaError

The `Schema.decodeUnknownResult` and `Schema.encodeResult` functions return a [Result](/docs/v4/data-types/result), with different success types for each direction:

```ts showLineNumbers=false
decodeUnknownResult: (input: unknown) => Result<T, SchemaError>
encodeResult: (input: T) => Result<E, SchemaError>
```

where `SchemaError` is defined as follows (simplified):

```ts showLineNumbers=false
interface SchemaError {
  readonly _tag: "SchemaError"
  readonly issue: SchemaIssue.Issue
}
```

In this structure, `SchemaIssue.Issue` represents an error that might occur during decoding or encoding.
It is wrapped in a tagged error to make it easier to catch errors using [Effect.catchTag](/docs/v4/error-management/expected-errors#catchtag).
Decoding succeeds with the decoded type `T`, while encoding succeeds with the encoded type `E`. In either direction, a schema mismatch produces a `Failure` containing a `SchemaError`.

<Aside type="tip" title="Returning All Errors">
  By default only the first error is returned. You can use the
  [`errors`](#receiving-all-errors) option to receive all errors.
</Aside>

## Parse Options

The options below provide control over both decoding and encoding behaviors.

### Managing Excess Properties

By default, any properties not defined in the schema are removed from the output when parsing a value. This ensures the parsed data conforms strictly to the expected structure.

If you want to detect and handle unexpected properties, use the `onExcessProperty` option (default value: `"ignore"`), which allows you to raise an error for excess properties. This can be helpful when you need to validate and catch unanticipated properties.

**Example** (Setting `onExcessProperty` to `"error"`)

```ts twoslash
import { Schema } from "effect"

const Person = Schema.Struct({
  name: Schema.String,
  age: Schema.Finite,
})

// Excess properties are ignored by default
console.log(
  Schema.decodeUnknownSync(Person)({
    name: "Bob",
    age: 40,
    email: "bob@example.com", // Ignored
  }),
)
/*
Output:
{ name: 'Bob', age: 40 }
*/

// With `onExcessProperty` set to "error",
// an error is thrown for excess properties
Schema.decodeUnknownSync(Person)(
  {
    name: "Bob",
    age: 40,
    email: "bob@example.com", // Will raise an error
  },
  { onExcessProperty: "error" },
)
/*
throws
SchemaError: Expected no excess property
  at ["email"]
*/
```

To retain extra properties, set `onExcessProperty` to `"preserve"`.

**Example** (Setting `onExcessProperty` to `"preserve"`)

```ts twoslash import.meta.vitest name="managing-excess-properties-1"
import { Schema } from "effect"

const Person = Schema.Struct({
  name: Schema.String,
  age: Schema.Finite,
})

// Excess properties are preserved in the output
Schema.decodeUnknownSync(Person)(
  {
    name: "Bob",
    age: 40,
    email: "bob@example.com",
  },
  { onExcessProperty: "preserve" },
) // => { email: "bob@example.com", name: "Bob", age: 40 }
```

### Receiving All Errors

The `errors` option enables you to retrieve all errors encountered during parsing. By default, only the first error is returned. Setting `errors` to `"all"` provides comprehensive error feedback, which can be useful for debugging or offering detailed validation feedback.

**Example** (Setting `errors` to `"all"`)

```ts twoslash
import { Schema } from "effect"

const Person = Schema.Struct({
  name: Schema.String,
  age: Schema.Finite,
})

// Attempt to parse with multiple issues in the input data
Schema.decodeUnknownSync(Person)(
  {
    name: "Bob",
    age: "abc",
    email: "bob@example.com",
  },
  { errors: "all", onExcessProperty: "error" },
)
/*
throws
SchemaError: Expected no excess property
  at ["email"]
Expected number
  at ["age"]
*/
```

### Managing Property Order

The `propertyOrder` option provides control over the order of object fields in the output. This feature is particularly useful when the sequence of keys is important for the consuming processes or when maintaining the input order enhances readability and usability.

By default, the `propertyOrder` option is set to `"none"`. This means that the internal system decides the order of keys to optimize parsing speed.
The order of keys in this mode should not be considered stable, and it's recommended not to rely on key ordering as it may change in future updates.

Setting `propertyOrder` to `"original"` ensures that the keys are ordered as they appear in the input during the decoding/encoding process.

**Example** (Synchronous Decoding)

```ts twoslash import.meta.vitest name="managing-property-order-1"
import { Schema } from "effect"

const schema = Schema.Struct({
  a: Schema.Finite,
  b: Schema.Literal("b"),
  c: Schema.Finite,
})

// Default decoding, where property order is system-defined
Schema.decodeUnknownSync(schema)({ b: "b", c: 2, a: 1 }) // => { a: 1, b: "b", c: 2 }

// Decoding while preserving input order
Schema.decodeUnknownSync(schema)(
  { b: "b", c: 2, a: 1 },
  { propertyOrder: "original" },
) // => { b: "b", c: 2, a: 1 }
```

**Example** (Asynchronous Decoding)

```ts twoslash
import type { Duration } from "effect"
import { Effect, Schema, SchemaGetter } from "effect"

// Helper function to simulate an async operation in schema
const effectify = (duration: Duration.Input) =>
  Schema.Finite.pipe(
    Schema.decodeTo(Schema.Finite, {
      decode: SchemaGetter.transformOrFail((x) =>
        Effect.sleep(duration).pipe(Effect.andThen(Effect.succeed(x))),
      ),
      encode: SchemaGetter.passthrough(),
    }),
  )

// Define a structure with asynchronous behavior in each field
const schema = Schema.Struct({
  a: effectify("200 millis"),
  b: effectify("300 millis"),
  c: effectify("100 millis"),
})

// Default decoding, where property order is system-defined
Schema.decodeEffect(schema)({ a: 1, b: 2, c: 3 }, { concurrency: 3 })
  .pipe(Effect.runPromise)
  .then(console.log)
// Output decided internally: { a: 1, b: 2, c: 3 }

// Decoding while preserving input order
Schema.decodeEffect(schema)(
  { a: 1, b: 2, c: 3 },
  { concurrency: 3, propertyOrder: "original" },
)
  .pipe(Effect.runPromise)
  .then(console.log)
// Output preserving input order: { a: 1, b: 2, c: 3 }
```

### Customizing Parsing Behavior at the Schema Level

The `parseOptions` annotation allows you to customize parsing behavior at different schema levels, enabling you to apply unique parsing settings to nested schemas within a structure. Options defined within a schema override parent-level settings and apply to all nested schemas.

**Example** (Using `parseOptions` to Customize Error Handling)

```ts twoslash import.meta.vitest name="customizing-parsing-behavior-at-the-schema-level-1"
import { Result, Schema } from "effect"

const schema = Schema.Struct({
  a: Schema.Struct({
    b: Schema.String,
    c: Schema.String,
  }).annotate({
    title: "first error only",
    // Limit errors to the first in this sub-schema
    parseOptions: { errors: "first" },
  }),
  d: Schema.String,
}).annotate({
  title: "all errors",
  // Capture all errors for the main schema
  parseOptions: { errors: "all" },
})

// Decode input with custom error-handling behavior
const result = Schema.decodeUnknownResult(schema)(
  { a: {} },
  { errors: "first" },
)
if (Result.isFailure(result)) {
  console.log(result.failure.message)
  result.failure.message // => 'Missing key\n  at ["a"]["b"]\nMissing key\n  at ["d"]'
}
```

**Detailed Output Explanation:**

In this example:

- The main schema is configured to display all errors. Hence, you will see errors related to both the `d` field (since it's missing) and any errors from the `a` subschema.
- The subschema (`a`) is set to display only the first error. Although both `b` and `c` fields are missing, only the first missing field (`b`) is reported.

## Type Guards

The `Schema.is` function provides a way to verify if a value conforms to a given schema. It acts as a [type guard](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates), taking a value of type `unknown` and determining if it matches the structure and type constraints defined in the schema.

Here's how the `Schema.is` function works:

1. **Schema Definition**: Define a schema to describe the structure and constraints of the data type you expect. Its decoded type `T` is the target type checked by the type guard.

2. **Type Guard Creation**: Use the schema to create a user-defined type guard, `(input: unknown) => input is T`. This function can be used at runtime to check if a value meets the requirements of the schema.

<Aside type="note" title="Role of the Encoded Type in Type Guards">
  The encoded type `E`, which is often used in schema transformations, does not
  affect the creation of the type guard. The purpose of the guard is to ensure
  that the input matches the decoded type `T`.
</Aside>

**Example** (Creating and Using a Type Guard)

```ts twoslash import.meta.vitest name="type-guards-1"
import { Schema } from "effect"

// Define a schema for a Person object
const Person = Schema.Struct({
  name: Schema.String,
  age: Schema.Finite,
})

// Generate a type guard from the schema
const isPerson = Schema.is(Person)

// Test the type guard with various inputs
isPerson({ name: "Alice", age: 30 }) // => true

isPerson(null) // => false

isPerson({}) // => false
```

The generated `isPerson` function has the following signature:

```ts showLineNumbers=false
const isPerson: <Input>(input: Input) => input is Input & {
  readonly name: string
  readonly age: number
}
```

## Assertions

While type guards verify whether a value conforms to a specific type, the `Schema.asserts` function goes further by asserting that an input matches the decoded type `T` described by the schema.
If the input does not match the schema, it throws a detailed error, making it useful for runtime validation.

<Aside type="note" title="Role of the Encoded Type in Assertions">
  The encoded type `E`, which is often used in schema transformations, does not
  affect the creation of the assertion. Its purpose is to ensure that the input
  matches the decoded type `T`.
</Aside>

**Example** (Creating and Using an Assertion)

```ts twoslash import.meta.vitest name="assertions-1"
import { Schema } from "effect"

// Define a schema for a Person object
const Person = Schema.Struct({
  name: Schema.String,
  age: Schema.Finite,
})

// Define an assertion wrapper for the schema
const assertsPerson: (input: unknown) => asserts input is {
  readonly name: string
  readonly age: number
} = (input) => Schema.asserts(Person, input)

try {
  // Attempt to assert that the input matches the Person schema
  assertsPerson({ name: "Alice", age: "30" })
} catch (e: any) {
  console.error("The input does not match the schema:")
  console.error(e.message)
  e.message // => 'Expected number\n  at ["age"]'
}

// This input matches the schema and will not throw an error
assertsPerson({ name: "Alice", age: 30 })
```

The `assertsPerson` wrapper has the following signature:

```ts showLineNumbers=false
const assertsPerson: (input: unknown) => asserts input is {
  readonly name: string
  readonly age: number
}
```

## Naming Conventions

Schema names describe the decoded type and, when a transformation is involved, the encoded representation it is decoded from.

Schemas whose decoded and encoded types are the same are generally named after that type:

- `Schema.Finite` describes finite numbers in both directions.
- `Schema.Date` describes `Date` values in both directions.

For transformed schemas, a name of the form `TFromE` reads as “decode `E` into `T`”:

- `Schema.FiniteFromString` decodes a `string` into a finite `number` and encodes the number back into a `string`.
- `Schema.DateFromString` decodes an ISO-formatted `string` into a `Date` and encodes the `Date` back into a `string`.
