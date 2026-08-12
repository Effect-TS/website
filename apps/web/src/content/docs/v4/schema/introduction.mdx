---
title: Introduction to Effect Schema
description: "Introduction to `effect/Schema`, a module for defining, validating, and transforming data schemas."
sidebar:
  label: Introduction
  order: 0
---

import { Aside } from "@astrojs/starlight/components"

Welcome to the documentation for `effect/Schema`, a module for defining and using schemas to validate and transform data in TypeScript.

The `effect/Schema` module allows you to define schema values that describe the structure and data types of your data. Once defined, you can leverage these schemas to perform a range of operations, including:

| Operation       | Description                                                                                                       |
| --------------- | ----------------------------------------------------------------------------------------------------------------- |
| Decoding        | Transforming data from an input type `Encoded` to an output type `Type`.                                          |
| Encoding        | Converting data from an output type `Type` back to an input type `Encoded`.                                       |
| Asserting       | Verifying that a value adheres to the schema's output type `Type`.                                                |
| Standard Schema | Generate a [Standard Schema V1](https://standardschema.dev/).                                                     |
| Arbitraries     | Generate [Arbitraries](/docs/v4/schema/arbitrary) for [fast-check](https://github.com/dubzzz/fast-check) testing. |
| JSON Schemas    | Create [JSON Schemas](/docs/v4/schema/json-schema) for the encoded representation of schemas.                     |
| Equivalence     | Create an [Equivalence](/docs/v4/schema/equivalence) based on a schema.                                           |
| Formatting      | Create a [Formatter](/docs/v4/schema/formatter) based on a schema.                                                |

## Requirements

- TypeScript 5.9 or newer. TypeScript 7 is recommended for the best performance and compatibility with [Effect's TypeScript tooling](/docs/v4/getting-started/devtools/).
- The `strict` flag enabled in your `tsconfig.json` file.
- (Optional) The `exactOptionalPropertyTypes` flag enabled in your `tsconfig.json` file.

```jsonc showLineNumbers=false
{
  "compilerOptions": {
    "strict": true,
    "exactOptionalPropertyTypes": true, // optional
  },
}
```

### The exactOptionalPropertyTypes Option

The `effect/Schema` module takes advantage of the `exactOptionalPropertyTypes` option of `tsconfig.json`. This option affects how optional properties are typed (to learn more about this option, you can refer to the official [TypeScript documentation](https://www.typescriptlang.org/tsconfig#exactOptionalPropertyTypes)).

**Example** (With `exactOptionalPropertyTypes` Enabled)

```ts twoslash
import { Schema } from "effect"

const Person = Schema.Struct({
  name: Schema.optionalKey(Schema.String),
})

type T = typeof Person.Type
/*
type T = {
    readonly name?: string;
}
*/

// @errors: 2379
Schema.decodeSync(Person)({ name: undefined })
```

With `exactOptionalPropertyTypes` enabled, `name` may be omitted, but when the property is present its value must be a `string`. TypeScript does not widen the property type to `string | undefined`, so the type checker rejects an explicit `{ name: undefined }`.

**Example** (With `exactOptionalPropertyTypes` Disabled)

If, for some reason, you can't enable the `exactOptionalPropertyTypes` option (perhaps due to conflicts with other third-party libraries), you can still use `effect/Schema`. However, there will be a mismatch between the types and the runtime behavior:

```ts
import { Schema } from "effect"

const Person = Schema.Struct({
  name: Schema.optionalKey(Schema.String),
})

type T = typeof Person.Type
/*
type T = {
    readonly name?: string | undefined;
}
*/

// No type error, but a decoding failure occurs
Schema.decodeSync(Person)({ name: undefined })
/*
throws
SchemaError: Expected string
  at ["name"]
*/
```

In this case, the type of `name` is widened to `string | undefined`, which means the type checker won't catch the invalid value (`undefined`). However, during decoding, you'll encounter an error, indicating that `undefined` is not allowed.

## Schema Views

A schema is an immutable value that describes the structure of your data. The same schema value can be viewed through different interfaces, depending on which type-level information an API needs:

| View                                                       | Type-level information retained                                      |
| ---------------------------------------------------------- | -------------------------------------------------------------------- |
| `Top`                                                      | No specific type information; accepts any schema                     |
| `Schema<Type>`                                             | Decoded type                                                         |
| `Decoder<Type, DecodingServices>`                          | Decoded type and services required for decoding                      |
| `Encoder<Encoded, EncodingServices>`                       | Encoded type and services required for encoding                      |
| `Codec<Type, Encoded, DecodingServices, EncodingServices>` | Decoded type, encoded type, and services required in both directions |

For example, the `Codec` view retains all four directional type parameters:

```text showLineNumbers=false
      ┌─── Type of the decoded value
      │     ┌─── Encoded type (input/output)
      │     │        ┌─── Services required for decoding
      │     │        │                 ┌─── Services required for encoding
      ▼     ▼        ▼                 ▼
Codec<Type, Encoded, DecodingServices, EncodingServices>
```

These type parameters have the following meanings:

| Parameter            | Description                                                                                                       |
| -------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Type**             | The type of value produced by decoding.                                                                           |
| **Encoded**          | The encoded representation accepted during decoding and produced during encoding. It defaults to `Type`.          |
| **DecodingServices** | The services required during decoding. It defaults to `never`, meaning that decoding has no service requirements. |
| **EncodingServices** | The services required during encoding. It defaults to `never`, meaning that encoding has no service requirements. |

**Examples**

- `Schema<string>` is a type-only view of any schema whose decoded type is `string`.
- `Decoder<number>` retains the decoded type but does not constrain the encoded type or encoding services.
- `Encoder<string>` retains the encoded type but does not constrain the decoded type or decoding services.
- `Codec<string>` is shorthand for `Codec<string, string, never, never>`.
- `Codec<number, string>` represents a codec that decodes a `number` from a `string`, encodes a `number` to a `string`, and requires no services.

<Aside type="note" title="Type Parameter Abbreviations">
  In the Effect ecosystem, you may encounter the type parameters of `Codec`
  abbreviated as `T`, `E`, `RD`, and `RE`: decoded **T**ype, **E**ncoded type,
  decoding services, and encoding services.
</Aside>

## Understanding Schema Values

**Schema Values**. Schema values are immutable descriptions of data. Combinators that compose, refine, or transform a schema return a new schema without modifying the original.

**Schema Interpreters**. A schema can be interpreted by different interpreters to produce operations such as decoding, encoding, formatting, and arbitrary generation.

## Understanding Decoding and Encoding

When working with data in TypeScript, you often need to handle data coming from or being sent to external systems. This data may not always match the format or types you expect, especially when dealing with user input, data from APIs, or data stored in different formats. To handle these discrepancies, we use **decoding** and **encoding**.

| Term         | Description                                                 |
| ------------ | ----------------------------------------------------------- |
| **Decoding** | Converts a value from its encoded type `E` to its type `T`. |
| **Encoding** | Converts a value from its type `T` to its encoded type `E`. |

For example, consider an HTTP endpoint whose request and response bodies contain a finite number represented as a JSON string. After the request body is parsed as JSON, decoding converts `"42"` into the number `42`. Before sending the response, encoding converts `42` back into `"42"`, which can then be serialized as JSON.

Below is a diagram that shows the relationship between encoding and decoding through the `Codec<T, E, RD, RE>` view:

```text showLineNumbers=false
┌─────────┐            ┌───┐                    ┌───┐                  ┌─────────┐
│ unknown │            │ T │                    │ E │                  │ unknown │
└─────────┘            └───┘                    └───┘                  └─────────┘
     │                   │                        │                         │
     │ is                │                        │                         │
     │───────────────────▶                        │                         │
     │                   │                        │                         │
     │ asserts           │                        │                         │
     │───────────────────▶                        │                         │
     │                   │                        │                         │
     │ encodeUnknownEffect                        │                         │
     │────────────────────────────────────────────▶                         │
     │                   │                        │                         │
     │                   │ encodeEffect           │                         │
     │                   │────────────────────────▶                         │
     │                   │                        │                         │
     │                   │ decodeEffect           │                         │
     │                   ◀────────────────────────│                         │
     │                   │                        │                         │
     │                   │ decodeUnknownEffect    │                         │
     │                   ◀──────────────────────────────────────────────────│
     │                   │                        │                         │
```

The diagram shows the Effect-based interpreters because they preserve the `RD` and `RE` service requirements. The `Sync`, `Result`, `Exit`, `Option`, and `Promise` variants follow the same directions but can only be used when the corresponding operation requires no services.

We'll illustrate these concepts using `Schema.FiniteFromString`, which can be viewed as a `Codec<number, string>`. It decodes a `string` into a finite `number`, encodes a finite `number` as a `string`, and requires no services in either direction.

### Encoding

When we talk about "encoding," we are referring to the process of changing a finite `number` into a `string`. To put it simply, it's the act of converting data from one format to another.

### Decoding

Conversely, "decoding" entails transforming a `string` into a finite `number`. It's essentially the reverse operation of encoding, where data is returned to its original form.

### Decoding From Unknown

Decoding from `unknown` involves two key steps:

1. **Checking:** Initially, we verify that the input data (which is of the `unknown` type) matches the expected structure. In our specific case, this means ensuring that the input is indeed a `string`.

2. **Decoding:** Following the successful check, we proceed to convert the `string` into a finite `number`. This process completes the decoding operation, where the data is both validated and transformed.

### Encoding From Unknown

Encoding from `unknown` involves two key steps:

1. **Checking:** Initially, we verify that the input data (which is of the `unknown` type) matches the expected structure. In our specific case, this means ensuring that the input is indeed a finite `number`.

2. **Encoding:** Following the successful check, we proceed to convert the finite `number` into a `string`. This process completes the encoding operation, where the data is both validated and transformed.

## Round-Trip

A highly desirable property of a schema is that an encoding-decoding round trip returns a value equivalent to the original:

```text showLineNumbers=false
decode(encode(value)) ≈ value
```

The round trip starts with encoding because `value` has type `T`: encoding produces an `E`, which is then decoded back into a `T`.

This property is not guaranteed. Some transformations intentionally normalize or discard information during encoding or decoding.
