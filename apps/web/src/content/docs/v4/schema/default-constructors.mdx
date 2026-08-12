---
title: Default Constructors
description: Construct schema values with make, makeOption, makeEffect, validation options, and default values.
sidebar:
  order: 12
---

import { Aside } from "@astrojs/starlight/components"

Every schema exposes constructors for creating values of its `Type` while applying constructor defaults and type-side checks.

<Aside type="note" title="Constructor Scope">
  Constructors operate on the schema's `Type`, not its `Encoded`. For example, the constructor of `Schema.FiniteFromString` accepts a `number`, while decoding accepts a `string`.

</Aside>

Use `make` when a failure should throw, `makeOption` when you only need to know whether construction succeeded, and `makeEffect` when you need the `SchemaError` in the `Effect` error channel.

**Example** (Using a Refinement Default Constructor)

```ts twoslash
import { Schema } from "effect"

const schema = Schema.FiniteFromString.check(
  Schema.isBetween({ minimum: 1, maximum: 10 }),
)

// The constructor only accepts numbers
console.log(schema.make(5))
// Output: 5

// This will throw an error because the number is outside the valid range
console.log(schema.make(20))
/*
throws:
Expected a number between 1 and 10
*/
```

## Structs

Struct schemas allow you to define objects with specific fields and constraints. The `make` function can be used to create instances of a struct schema.

**Example** (Creating Struct Instances)

```ts twoslash
import { Schema } from "effect"

const Struct = Schema.Struct({
  name: Schema.NonEmptyString,
})

// Successful creation
Struct.make({ name: "a" })

// This will throw an error because the name is empty
Struct.make({ name: "" })
/*
throws
Expected a value with a length of at least 1
  at ["name"]
*/
```

When the input is already trusted, `make` can skip schema checks. This is not recommended for untrusted values.

**Example** (Skipping Checks)

```ts twoslash
import { Schema } from "effect"

const Struct = Schema.Struct({
  name: Schema.NonEmptyString,
})

// Skip checks when the input is already trusted
Struct.make({ name: "" }, { disableChecks: true })
```

## Records

Record schemas allow you to define key-value mappings where the keys and values must meet specific criteria.

**Example** (Creating Record Instances)

```ts twoslash
import { Schema } from "effect"

const Record = Schema.Record(Schema.String, Schema.NonEmptyString)

// Successful creation
Record.make({ a: "a", b: "b" })

// This will throw an error because 'b' is empty
Record.make({ a: "a", b: "" })
/*
throws
Expected a value with a length of at least 1
  at ["b"]
*/

// Skips checks
Record.make({ a: "a", b: "" }, { disableChecks: true })
```

## Filters

Filters allow you to define constraints on individual values.

**Example** (Using Filters to Enforce Ranges)

```ts twoslash
import { Schema } from "effect"

const MyNumber = Schema.Finite.check(
  Schema.isBetween({ minimum: 1, maximum: 10 }),
)

// Successful creation
const n = MyNumber.make(5)

// This will throw an error because the number is outside the valid range
MyNumber.make(20)
/*
throws
Expected a value between 1 and 10
*/

// Skips checks
MyNumber.make(20, { disableChecks: true })
```

## Branded Types

Branded schemas add metadata to a value to give it a more specific type, while still retaining its original type.

**Example** (Creating Branded Values)

```ts twoslash
import { Schema } from "effect"

const BrandedNumberSchema = Schema.Finite.pipe(
  Schema.check(Schema.isBetween({ minimum: 1, maximum: 10 })),
  Schema.brand("MyNumber"),
)

// Successful creation
const n = BrandedNumberSchema.make(5)

// This will throw an error because the number is outside the valid range
BrandedNumberSchema.make(20)
/*
throws
Expected a value between 1 and 10
*/

// Skips checks
BrandedNumberSchema.make(20, { disableChecks: true })
```

When using default constructors, it is helpful to understand the type of value they produce.

For instance, in the `BrandedNumberSchema` example, the return type of the constructor is `number & Brand<"MyNumber">`. This indicates that the resulting value is a `number` with additional branding information, `"MyNumber"`.

This behavior contrasts with the filter example, where the return type is simply `number`. Branding adds an extra layer of type information, which can assist in identifying and working with your data more effectively.

## Error Handling in Constructors

`make` is appropriate when invalid constructor input is exceptional. If failure is expected, use `makeOption` or `makeEffect` instead.

`makeOption` returns `Option.some` on success and `Option.none` for schema issues. Use `makeEffect` when you need the full `SchemaError`.

**Example** (Constructing Without Throwing)

```ts twoslash import.meta.vitest name="constructor-error-handling-1"
import { Option, Schema } from "effect"

const schema = Schema.FiniteFromString.check(
  Schema.isBetween({ minimum: 1, maximum: 10 }),
)

schema.makeOption(5) // => Option.some(5)
schema.makeOption(20) // => Option.none()

// Effect.Effect<number, SchemaError>
const safely = schema.makeEffect(20)
```

## Setting Default Values

When creating objects, you might want to assign default values to certain fields to simplify object construction. The `Schema.withConstructorDefault` function lets you handle default values, making fields optional in the default constructor.

**Example** (Struct with Required Fields)

In this example, all fields are required when creating a new instance.

```ts twoslash import.meta.vitest name="setting-default-values-1"
import { Schema } from "effect"

const Person = Schema.Struct({
  name: Schema.NonEmptyString,
  age: Schema.Finite,
})

// Both name and age must be provided
console.log(Person.make({ name: "John", age: 30 }))
/*
Output: { name: 'John', age: 30 }
*/
```

**Example** (Struct with Default Value)

Here, the `age` field is optional because it has a default value of `0`.

```ts twoslash import.meta.vitest name="setting-default-values-2"
import { Effect, Schema } from "effect"

const Person = Schema.Struct({
  name: Schema.NonEmptyString,
  age: Schema.Finite.pipe(Schema.withConstructorDefault(Effect.succeed(0))),
})

// The age field is optional and defaults to 0
console.log(Person.make({ name: "John" }))
/*
Output:
{ name: 'John', age: 0 }
*/

console.log(Person.make({ name: "John", age: 30 }))
/*
Output:
{ name: 'John', age: 30 }
*/
```

### Nested Defaults

Constructor defaults compose through nested schemas. Inner defaults are resolved after the value for the outer field is supplied or defaulted.

**Example** (Resolving Nested Defaults)

```ts twoslash import.meta.vitest name="nested-constructor-defaults-1"
import { Effect, Schema } from "effect"

const Config = Schema.Struct({
  web: Schema.Struct({
    application_url: Schema.String.pipe(
      Schema.withConstructorDefault(Effect.succeed("http://localhost")),
    ),
    application_port: Schema.Finite,
  }).pipe(
    Schema.withConstructorDefault(Effect.succeed({ application_port: 3000 })),
  ),
})

console.log(Config.make({}))
/*
Output:
{
  web: {
    application_url: 'http://localhost',
    application_port: 3000
  }
}
*/
```

### Lazy Evaluation of Defaults

Defaults are lazily evaluated, meaning that a new instance of the default is generated every time the constructor is called:

**Example** (Lazy Evaluation of Defaults)

In this example, the `timestamp` field generates a new value for each instance.

```ts twoslash import.meta.vitest name="lazy-evaluation-of-defaults-1"
import { Effect, Schema } from "effect"

const Person = Schema.Struct({
  name: Schema.NonEmptyString,
  age: Schema.Finite.pipe(Schema.withConstructorDefault(Effect.succeed(0))),
  timestamp: Schema.Finite.pipe(
    Schema.withConstructorDefault(Effect.sync(() => new Date().getTime())),
  ),
})

console.log(Person.make({ name: "name1" }))
/*
Example Output:
{ age: 0, timestamp: 1714232909221, name: 'name1' }
*/

console.log(Person.make({ name: "name2" }))
/*
Example Output:
{ age: 0, timestamp: 1714232909227, name: 'name2' }
*/
```

### Reusing Defaults Across Schemas

Default values are also "portable", meaning that if you reuse the same property signature in another schema, the default is carried over:

**Example** (Reusing Defaults in Another Schema)

```ts twoslash import.meta.vitest name="reusing-defaults-across-schemas-1"
import { Effect, Schema } from "effect"

const Person = Schema.Struct({
  name: Schema.NonEmptyString,
  age: Schema.Finite.pipe(Schema.withConstructorDefault(Effect.succeed(0))),
  timestamp: Schema.Finite.pipe(
    Schema.withConstructorDefault(Effect.sync(() => new Date().getTime())),
  ),
})

const AnotherSchema = Schema.Struct({
  foo: Schema.String,
  age: Person.fields.age,
})

console.log(AnotherSchema.make({ foo: "bar" }))
/*
Output:
{ foo: 'bar', age: 0 }
*/
```

### Using Defaults in Classes

Default values can also be applied when working with the `Class` API, ensuring consistency across class-based schemas.

**Example** (Defaults in a Class)

```ts twoslash import.meta.vitest name="using-defaults-in-classes-1"
import { Effect, Schema } from "effect"

class Person extends Schema.Class<Person>("Person")({
  name: Schema.NonEmptyString,
  age: Schema.Finite.pipe(Schema.withConstructorDefault(Effect.succeed(0))),
  timestamp: Schema.Finite.pipe(
    Schema.withConstructorDefault(Effect.sync(() => new Date().getTime())),
  ),
}) {}

console.log(new Person({ name: "name1" }))
/*
Example Output:
Person { age: 0, timestamp: 1714400867208, name: 'name1' }
*/

console.log(new Person({ name: "name2" }))
/*
Example Output:
Person { age: 0, timestamp: 1714400867215, name: 'name2' }
*/
```
