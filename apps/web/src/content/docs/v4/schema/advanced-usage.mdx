---
title: Advanced Usage
description: Learn advanced techniques for defining and extending data schemas, including recursive and mutually recursive types, optional fields, branded types, and schema transformations.
sidebar:
  order: 5
---

import { Aside } from "@astrojs/starlight/components"

## Declaring New Data Types

### Primitive Data Types

To declare a schema for an opaque, non-generic data type, you can use `Schema.declare` with a type guard. The following example shows the low-level pattern with `File`.

<Aside type="note">
  Effect already provides `Schema.File`; the declaration below is illustrative.
</Aside>

**Example** (Declaring a Schema for `File`)

```ts twoslash
import { Schema } from "effect"

// Declare a schema for the File type using a type guard
const FileSchema = Schema.declare(
  (input: unknown): input is File => input instanceof File,
)

const decode = Schema.decodeUnknownSync(FileSchema)

// Decoding a valid File object
console.log(decode(new File([], "")))
/*
Output:
File { size: 0, type: '', name: '', lastModified: 1724774163056 }
*/

// Decoding an invalid input
decode(null)
/*
throws
SchemaError: Expected <Declaration>
*/
```

<Aside type="tip" title="Adding Annotations">
  Annotations like `identifier` and `description` are useful for improving error
  messages and making schemas self-documenting.
</Aside>

You can add `identifier`, `title`, and `description` annotations to make the declaration easier for people and schema interpreters to understand. `identifier` and `title` can also improve the default expected-value message.

- **Identifier**: a unique name for the schema
- **Title**: a brief, descriptive title
- **Description**: a detailed explanation of the schema's purpose

**Example** (Declaring a Schema with Annotations)

```ts twoslash
import { Schema } from "effect"

// Declare a schema for the File type with additional annotations
const FileSchema = Schema.declare(
  (input: unknown): input is File => input instanceof File,
  {
    // A unique identifier for the schema
    identifier: "File",
    // Detailed description of the schema
    description: "The `File` type in JavaScript",
  },
)

const decode = Schema.decodeUnknownSync(FileSchema)

// Decoding a valid File object
console.log(decode(new File([], "")))
/*
Output:
File { size: 0, type: '', name: '', lastModified: 1724774163056 }
*/

// Decoding an invalid input
decode(null)
/*
throws
SchemaError: Expected File
*/
```

### Type Constructors

Type constructors are generic types that take one or more types as arguments and return a new type. To define a schema for a type constructor, you can use the `Schema.declare` function.

**Example** (Declaring a Schema for `ReadonlySet<T>`)

```ts twoslash
import {
  Effect,
  Schema,
  SchemaIssue,
  SchemaParser,
  SchemaTransformation,
} from "effect"

export const MyReadonlySet = <S extends Schema.Constraint>(
  // Schema for the elements of the Set
  item: S,
) =>
  Schema.declareConstructor<
    ReadonlySet<S["Type"]>,
    ReadonlySet<S["Encoded"]>
  >()(
    // Store the schema for the Set's elements
    [item],
    // Decoding function
    ([item]) =>
      (input, ast, options) => {
        if (input instanceof Set) {
          // Decode each element in the Set
          return Effect.map(
            SchemaParser.decodeUnknownEffect(Schema.Array(item))(
              Array.from(input.values()),
              options,
            ),
            // Return a ReadonlySet containing the decoded elements
            (values): ReadonlySet<S["Type"]> => new Set(values),
          )
        }
        // Handle invalid input
        return Effect.fail(new SchemaIssue.InvalidType(ast))
      },
    {
      expected: "ReadonlySet",
      // Define the encoding side by linking back to an Array schema
      toCodec: ([item]) =>
        Schema.link<ReadonlySet<S["Encoded"]>>()(
          Schema.Array(item),
          SchemaTransformation.transform({
            // Decode an array into a ReadonlySet
            decode: (values): ReadonlySet<S["Encoded"]> => new Set(values),
            // Encode a ReadonlySet back into an array
            encode: (set) => Array.from(set.values()),
          }),
        ),
    },
  )

// Define a schema for a ReadonlySet of numbers
const setOfNumbers = MyReadonlySet(Schema.FiniteFromString)

const decode = Schema.decodeUnknownSync(setOfNumbers)

console.log(decode(new Set(["1", "2", "3"]))) // Set(3) { 1, 2, 3 }

// Decode an invalid input
decode(null)
/*
throws
SchemaError: Expected ReadonlySet
*/

// Decode a Set with an invalid element
decode(new Set(["1", null, "3"]))
/*
throws
SchemaError: Expected string
  at [1]
*/
```

<Aside type="caution" title="Decoding/Encoding Limitations">
  The parser returned by `declareConstructor` is effectful, but the resulting
  codec can require only the decoding and encoding services already required by
  its type-parameter schemas.
</Aside>

### Adding Interpreter Annotations

When defining a new data type, schema interpreters such as [Arbitrary](/docs/v4/schema/arbitrary) or [Formatter](/docs/v4/schema/formatter) may not know how to handle the new type.
This can result in an error, as the interpreter may lack the necessary information for generating instances or producing readable output:

**Example** (Attempting to Generate Arbitrary Values Without Required Annotations)

```ts twoslash
import { Schema } from "effect"

// Define a schema for the File type
const FileSchema = Schema.declare(
  (input: unknown): input is File => input instanceof File,
  {
    identifier: "File",
  },
)

// Try creating an Arbitrary instance for the schema
const arb = Schema.toArbitrary(FileSchema)
/*
throws:
Error: Missing annotation
details: Generating an Arbitrary for this schema requires an "arbitrary" annotation
schema (Declaration): File
*/
```

In the above example, attempting to generate arbitrary values for `FileSchema` fails because the interpreter lacks the necessary annotations. To resolve this, provide an annotation for generating arbitrary data:

**Example** (Adding Arbitrary Annotation for Custom `File` Schema)

```ts twoslash import.meta.vitest name="adding-interpreter-annotations-1"
import { Schema } from "effect"
import { FastCheck } from "effect/testing"

const FileSchema = Schema.declare(
  (input: unknown): input is File => input instanceof File,
  {
    identifier: "File",
    // Provide a function to generate random File instances
    toArbitrary: () => (fc) =>
      fc
        .tuple(fc.string(), fc.string())
        .map(([content, path]) => new File([content], path)),
  },
)

// Create an Arbitrary instance for the schema
const arb = Schema.toArbitrary(FileSchema)

// Generate sample files using the Arbitrary instance
const files = FastCheck.sample(arb, 2)
console.log(files)
/*
Example Output:
[
  File { size: 5, type: '', name: 'C', lastModified: 1706435571176 },
  File { size: 1, type: '', name: '98Ggmc', lastModified: 1706435571176 }
]
*/
```

For more details on how to add annotations for the Arbitrary interpreter, refer to the [Arbitrary](/docs/v4/schema/arbitrary) documentation.

## Branded types

TypeScript's type system is structural, which means that any two types that are structurally equivalent are considered the same.
This can cause issues when types that are semantically different are treated as if they were the same.

**Example** (Structural Typing Issue)

```ts twoslash
type UserId = string
type Username = string

declare const getUser: (id: UserId) => object

const myUsername: Username = "gcanti"

getUser(myUsername) // This erroneously works
```

In the above example, `UserId` and `Username` are both aliases for the same type, `string`. This means that the `getUser` function can mistakenly accept a `Username` as a valid `UserId`, causing bugs and errors.

To prevent this, Effect introduces **branded types**. These types attach a unique identifier (or "brand") to a type, allowing you to differentiate between structurally similar but semantically distinct types.

**Example** (Defining Branded Types)

```ts twoslash
import { Brand } from "effect"

type UserId = string & Brand.Brand<"UserId">
type Username = string

declare const getUser: (id: UserId) => object

const myUsername: Username = "gcanti"

// @errors: 2345
getUser(myUsername)
```

By defining `UserId` as a branded type, the `getUser` function can accept only values of type `UserId`, and not plain strings or other types that are compatible with strings. This helps to prevent bugs caused by accidentally passing the wrong type of value to the function.

There are two ways to define a schema for a branded type, depending on whether you:

- want to define the schema from scratch
- have already defined a branded type via [`effect/Brand`](/docs/v4/code-style/branded-types) and want to reuse it to define a schema

### Defining a brand schema from scratch

To define a schema for a branded type from scratch, use the `Schema.brand` function.

**Example** (Creating a schema for a Branded Type)

```ts twoslash
import { Schema } from "effect"

const UserId = Schema.String.pipe(Schema.brand("UserId"))

// string & Brand<"UserId">
type UserId = typeof UserId.Type
```

### Reusing an existing branded constructor

If you have already defined a branded type using the [`effect/Brand`](/docs/v4/code-style/branded-types) module, you can reuse it to define a schema using the `Schema.fromBrand` function.

**Example** (Reusing an Existing Branded Type)

```ts twoslash
import { Schema } from "effect"
import { Brand } from "effect"

// the existing branded type
type UserId = string & Brand.Brand<"UserId">

const UserId = Brand.nominal<UserId>()

// Define a schema for the branded type
const UserIdSchema = Schema.String.pipe(Schema.fromBrand("UserId", UserId))
```

### Utilizing Default Constructors

The `Schema.brand` function includes a default constructor to facilitate the creation of branded values.

```ts twoslash import.meta.vitest name="utilizing-default-constructors-1"
import { Schema } from "effect"

const UserId = Schema.String.pipe(Schema.brand("UserId"))

const userId = UserId.make("123") // => "123"
```

## Property Signatures

Property signature combinators control a struct field independently on the encoded and decoded sides. They can make a key optional, allow `undefined`, provide defaults, attach key-level annotations, or rename the encoded key.

### Basic Usage

A property signature can be defined with annotations to provide additional context about a field.

**Example** (Adding Annotations to a Property Signature)

```ts twoslash
import { Schema } from "effect"

const Person = Schema.Struct({
  name: Schema.String,
  age: Schema.FiniteFromString.pipe(
    Schema.annotateKey({
      title: "Age", // Annotation to label the age field
    }),
  ),
})
```

Use `Schema.annotateKey` for field metadata. When the external representation uses a different key, use `Schema.encodeKeys` on the struct.

**Example** (Mapping from a Different Key)

```ts twoslash import.meta.vitest name="basic-usage-1"
import { Schema } from "effect"

const Person = Schema.Struct({
  name: Schema.String,
  age: Schema.FiniteFromString, // Maps from "AGE" to "age"
}).pipe(Schema.encodeKeys({ age: "AGE" }))

console.log(Schema.decodeUnknownSync(Person)({ name: "name", AGE: "18" }))
// Output: { name: 'name', age: 18 }
```

### Optional Fields

#### Basic Optional Property

`Schema.optional` makes a key optional and allows `undefined` when the key is present.

##### Decoding

| Input             | Output                    |
| ----------------- | ------------------------- |
| `<missing value>` | remains `<missing value>` |
| `undefined`       | remains `undefined`       |
| `e: E`            | transforms to `t: T`      |

##### Encoding

| Input             | Output                    |
| ----------------- | ------------------------- |
| `<missing value>` | remains `<missing value>` |
| `undefined`       | remains `undefined`       |
| `t: T`            | transforms back to `e: E` |

**Example** (Defining an Optional Number Field)

```ts twoslash import.meta.vitest name="basic-optional-property-1"
import { Schema } from "effect"

const Product = Schema.Struct({
  quantity: Schema.optional(Schema.FiniteFromString),
})

//     ┌─── { readonly quantity?: string | undefined; }
//     ▼
type Encoded = typeof Product.Encoded

//     ┌─── { readonly quantity?: number | undefined; }
//     ▼
type Type = typeof Product.Type

// Decoding examples

console.log(Schema.decodeUnknownSync(Product)({ quantity: "1" }))
// Output: { quantity: 1 }
console.log(Schema.decodeUnknownSync(Product)({}))
// Output: {}
console.log(Schema.decodeUnknownSync(Product)({ quantity: undefined }))
// Output: { quantity: undefined }

// Encoding examples

console.log(Schema.encodeSync(Product)({ quantity: 1 }))
// Output: { quantity: "1" }
console.log(Schema.encodeSync(Product)({}))
// Output: {}
console.log(Schema.encodeSync(Product)({ quantity: undefined }))
// Output: { quantity: undefined }
```

#### Optional with Nullability

Combine `Schema.optional`, `Schema.NullOr`, and an optional-field transformation when `null` should be treated as a missing value.

##### Decoding

| Input             | Output                          |
| ----------------- | ------------------------------- |
| `<missing value>` | remains `<missing value>`       |
| `undefined`       | remains `undefined`             |
| `null`            | transforms to `<missing value>` |
| `e: E`            | transforms to `t: T`            |

##### Encoding

| Input             | Output                    |
| ----------------- | ------------------------- |
| `<missing value>` | remains `<missing value>` |
| `undefined`       | remains `undefined`       |
| `t: T`            | transforms back to `e: E` |

**Example** (Handling Null as Missing Value)

```ts twoslash import.meta.vitest name="optional-with-nullability-1"
import { Option, Predicate, Schema, SchemaGetter } from "effect"

const Product = Schema.Struct({
  quantity: Schema.optional(Schema.NullOr(Schema.FiniteFromString)).pipe(
    Schema.decodeTo(Schema.optional(Schema.Finite), {
      decode: SchemaGetter.transformOptional((o) =>
        o.pipe(Option.filter(Predicate.isNotNull)),
      ),
      encode: SchemaGetter.transformOptional((o) => o),
    }),
  ),
})

//     ┌─── { readonly quantity?: string | null | undefined; }
//     ▼
type Encoded = typeof Product.Encoded

//     ┌─── { readonly quantity?: number | undefined; }
//     ▼
type Type = typeof Product.Type

// Decoding examples

console.log(Schema.decodeUnknownSync(Product)({ quantity: "1" }))
// Output: { quantity: 1 }
console.log(Schema.decodeUnknownSync(Product)({}))
// Output: {}
console.log(Schema.decodeUnknownSync(Product)({ quantity: undefined }))
// Output: { quantity: undefined }
console.log(Schema.decodeUnknownSync(Product)({ quantity: null }))
// Output: {}

// Encoding examples

console.log(Schema.encodeSync(Product)({ quantity: 1 }))
// Output: { quantity: "1" }
console.log(Schema.encodeSync(Product)({}))
// Output: {}
console.log(Schema.encodeSync(Product)({ quantity: undefined }))
// Output: { quantity: undefined }
```

#### Exact Optional Key

`Schema.optionalKey` makes the key optional without adding `undefined` to its value type. If the key is present, its value must be accepted by the wrapped schema.

##### Decoding

| Input             | Output                    |
| ----------------- | ------------------------- |
| `<missing value>` | remains `<missing value>` |
| `undefined`       | `SchemaError`             |
| `e: E`            | transforms to `t: T`      |

##### Encoding

| Input             | Output                    |
| ----------------- | ------------------------- |
| `<missing value>` | remains `<missing value>` |
| `t: T`            | transforms back to `e: E` |

**Example** (Using Exactness with Optional Field)

```ts twoslash
import { Schema } from "effect"

const Product = Schema.Struct({
  quantity: Schema.optionalKey(Schema.FiniteFromString),
})

//     ┌─── { readonly quantity?: string; }
//     ▼
type Encoded = typeof Product.Encoded

//     ┌─── { readonly quantity?: number; }
//     ▼
type Type = typeof Product.Type

// Decoding examples

console.log(Schema.decodeUnknownSync(Product)({ quantity: "1" }))
// Output: { quantity: 1 }
console.log(Schema.decodeUnknownSync(Product)({}))
// Output: {}
console.log(Schema.decodeUnknownSync(Product)({ quantity: undefined }))
/*
throws:
SchemaError: Expected string
  at ["quantity"]
*/

// Encoding examples

console.log(Schema.encodeSync(Product)({ quantity: 1 }))
// Output: { quantity: "1" }
console.log(Schema.encodeSync(Product)({}))
// Output: {}
```

#### Exact Optional Key with Nullability

Combine `Schema.optionalKey`, `Schema.NullOr`, and an optional-field transformation when `null` should be treated as a missing key but `undefined` should still be rejected.

##### Decoding

| Input             | Output                          |
| ----------------- | ------------------------------- |
| `<missing value>` | remains `<missing value>`       |
| `null`            | transforms to `<missing value>` |
| `undefined`       | `SchemaError`                   |
| `e: E`            | transforms to `t: T`            |

##### Encoding

| Input             | Output                    |
| ----------------- | ------------------------- |
| `<missing value>` | remains `<missing value>` |
| `t: T`            | transforms back to `e: E` |

**Example** (Using Exactness and Handling Null as Missing Value with Optional Field)

```ts twoslash
import { Option, Predicate, Schema, SchemaGetter } from "effect"

const Product = Schema.Struct({
  quantity: Schema.optionalKey(Schema.NullOr(Schema.FiniteFromString)).pipe(
    Schema.decodeTo(Schema.optionalKey(Schema.Finite), {
      decode: SchemaGetter.transformOptional((o) =>
        o.pipe(Option.filter(Predicate.isNotNull)),
      ),
      encode: SchemaGetter.transformOptional((o) => o),
    }),
  ),
})

//     ┌─── { readonly quantity?: string | null; }
//     ▼
type Encoded = typeof Product.Encoded

//     ┌─── { readonly quantity?: number; }
//     ▼
type Type = typeof Product.Type

// Decoding examples

console.log(Schema.decodeUnknownSync(Product)({ quantity: "1" }))
// Output: { quantity: 1 }
console.log(Schema.decodeUnknownSync(Product)({}))
// Output: {}
console.log(Schema.decodeUnknownSync(Product)({ quantity: undefined }))
/*
throws:
SchemaError: Expected string | null
  at ["quantity"]
*/
console.log(Schema.decodeUnknownSync(Product)({ quantity: null }))
// Output: {}

// Encoding examples

console.log(Schema.encodeSync(Product)({ quantity: 1 }))
// Output: { quantity: "1" }
console.log(Schema.encodeSync(Product)({}))
// Output: {}
```

### Representing Optional Fields with never Type

When creating a schema to replicate a TypeScript type that includes optional fields with the `never` type, like:

```ts
type MyType = {
  readonly quantity?: never
}
```

the handling of these fields depends on the `exactOptionalPropertyTypes` setting in your `tsconfig.json`.
This setting affects whether the schema should treat optional `never`-typed fields as simply absent or allow `undefined` as a value.

**Example** (`exactOptionalPropertyTypes: false`)

When this feature is turned off, you can employ the `Schema.optional` function. This approach allows the field to implicitly accept `undefined` as a value.

```ts twoslash
import { Schema } from "effect"

const Product = Schema.Struct({
  quantity: Schema.optional(Schema.Never),
})

//     ┌─── { readonly quantity?: undefined; }
//     ▼
type Encoded = typeof Product.Encoded

//     ┌─── { readonly quantity?: undefined; }
//     ▼
type Type = typeof Product.Type
```

**Example** (`exactOptionalPropertyTypes: true`)

When this feature is turned on, use `Schema.optionalKey` so that the field can only be absent.

```ts twoslash
import { Schema } from "effect"

const Product = Schema.Struct({
  quantity: Schema.optionalKey(Schema.Never),
})

//     ┌─── { readonly quantity?: never; }
//     ▼
type Encoded = typeof Product.Encoded

//     ┌─── { readonly quantity?: never; }
//     ▼
type Type = typeof Product.Type
```

### Default Values

Use `Schema.withDecodingDefaultType` or `Schema.withDecodingDefaultTypeKey` to provide a decoded default. Constructor defaults are independent and can be added with `Schema.withConstructorDefault`.

#### Basic Default

This is the simplest use case. If the input is missing or `undefined`, the default value will be applied.

| Operation    | Behavior                                                         |
| ------------ | ---------------------------------------------------------------- |
| **Decoding** | Applies the default value if the input is missing or `undefined` |
| **Encoding** | Transforms the input `t: T` back to `e: E`                       |

**Example** (Applying Default When Field Is Missing or `undefined`)

```ts twoslash import.meta.vitest name="basic-default-1"
import { Effect, Schema } from "effect"

const Product = Schema.Struct({
  quantity: Schema.FiniteFromString.pipe(
    Schema.withDecodingDefaultType(Effect.succeed(1)), // Default value for quantity
    Schema.withConstructorDefault(Effect.succeed(1)),
  ),
})

//     ┌─── { readonly quantity?: string | undefined; }
//     ▼
type Encoded = typeof Product.Encoded

//     ┌─── { readonly quantity: number; }
//     ▼
type Type = typeof Product.Type

// Decoding examples with default applied

console.log(Schema.decodeUnknownSync(Product)({}))
// Output: { quantity: 1 }

console.log(Schema.decodeUnknownSync(Product)({ quantity: undefined }))
// Output: { quantity: 1 }

console.log(Schema.decodeUnknownSync(Product)({ quantity: "2" }))
// Output: { quantity: 2 }

// Object construction examples with default applied

console.log(Product.make({}))
// Output: { quantity: 1 }

console.log(Product.make({ quantity: 2 }))
// Output: { quantity: 2 }
```

#### Default for a Missing Key

Use `Schema.withDecodingDefaultTypeKey` when the default should apply only if the key is missing, not when its value is `undefined`.

| Operation    | Behavior                                               |
| ------------ | ------------------------------------------------------ |
| **Decoding** | Applies the default value only if the input is missing |
| **Encoding** | Transforms the input `t: T` back to `e: E`             |

**Example** (Applying Default Only When Field Is Missing)

```ts twoslash
import { Effect, Schema } from "effect"

const Product = Schema.Struct({
  quantity: Schema.FiniteFromString.pipe(
    Schema.withDecodingDefaultTypeKey(Effect.succeed(1)), // Default value for quantity, only if quantity is not provided
  ),
})

//     ┌─── { readonly quantity?: string; }
//     ▼
type Encoded = typeof Product.Encoded

//     ┌─── { readonly quantity: number; }
//     ▼
type Type = typeof Product.Type

console.log(Schema.decodeUnknownSync(Product)({}))
// Output: { quantity: 1 }

console.log(Schema.decodeUnknownSync(Product)({ quantity: "2" }))
// Output: { quantity: 2 }

console.log(Schema.decodeUnknownSync(Product)({ quantity: undefined }))
/*
throws:
SchemaError: Expected string
  at ["quantity"]
*/
```

#### Default with Nullability

Combine an optional nullable field with `SchemaGetter.transformOptional` when missing, `undefined`, and `null` should all produce the default.

| Operation    | Behavior                                                                   |
| ------------ | -------------------------------------------------------------------------- |
| **Decoding** | Applies the default value if the input is missing or `undefined` or `null` |
| **Encoding** | Transforms the input `t: T` back to `e: E`                                 |

**Example** (Applying Default When Field Is Missing or `undefined` or `null`)

```ts twoslash import.meta.vitest name="default-with-nullability-1"
import { Option, Predicate, Schema, SchemaGetter } from "effect"

const Product = Schema.Struct({
  quantity: Schema.optional(Schema.NullOr(Schema.FiniteFromString)).pipe(
    Schema.decodeTo(Schema.Finite, {
      decode: SchemaGetter.transformOptional((o) =>
        o.pipe(
          Option.filter(Predicate.isNotNullish),
          Option.orElseSome(() => 1),
        ),
      ),
      encode: SchemaGetter.required(),
    }),
  ),
})

//     ┌─── { readonly quantity?: string | null | undefined; }
//     ▼
type Encoded = typeof Product.Encoded

//     ┌─── { readonly quantity: number; }
//     ▼
type Type = typeof Product.Type

console.log(Schema.decodeUnknownSync(Product)({}))
// Output: { quantity: 1 }

console.log(Schema.decodeUnknownSync(Product)({ quantity: undefined }))
// Output: { quantity: 1 }

console.log(Schema.decodeUnknownSync(Product)({ quantity: null }))
// Output: { quantity: 1 }

console.log(Schema.decodeUnknownSync(Product)({ quantity: "2" }))
// Output: { quantity: 2 }
```

#### Default for a Missing or Null Key

Use an exact optional nullable field when missing and `null` should produce the default but `undefined` should be rejected.

| Operation    | Behavior                                                    |
| ------------ | ----------------------------------------------------------- |
| **Decoding** | Applies the default value if the input is missing or `null` |
| **Encoding** | Transforms the input `t: T` back to `e: E`                  |

**Example** (Applying Default Only When Field Is Missing or `null`)

```ts twoslash
import { Option, Predicate, Schema, SchemaGetter } from "effect"

const Product = Schema.Struct({
  quantity: Schema.optionalKey(Schema.NullOr(Schema.FiniteFromString)).pipe(
    Schema.decodeTo(Schema.Finite, {
      decode: SchemaGetter.transformOptional((o) =>
        o.pipe(
          Option.filter(Predicate.isNotNull),
          Option.orElseSome(() => 1),
        ),
      ),
      encode: SchemaGetter.required(),
    }),
  ),
})

//     ┌─── { readonly quantity?: string | null; }
//     ▼
type Encoded = typeof Product.Encoded

//     ┌─── { readonly quantity: number; }
//     ▼
type Type = typeof Product.Type

console.log(Schema.decodeUnknownSync(Product)({}))
// Output: { quantity: 1 }

console.log(Schema.decodeUnknownSync(Product)({ quantity: null }))
// Output: { quantity: 1 }

console.log(Schema.decodeUnknownSync(Product)({ quantity: "2" }))
// Output: { quantity: 2 }

console.log(Schema.decodeUnknownSync(Product)({ quantity: undefined }))
/*
throws:
SchemaError: Expected string | null
  at ["quantity"]
*/
```

### Optional Fields as Options

When working with optional fields, you may want to handle them as [Option](/docs/v4/data-types/option) values. This approach allows you to explicitly manage the presence or absence of a field rather than relying on `undefined` or `null`.

#### Basic Optional with Option Type

`Schema.OptionFromOptional` converts a missing or `undefined` field to `Option.none()` and an existing value to `Option.some()`.

##### Decoding

| Input             | Output                            |
| ----------------- | --------------------------------- |
| `<missing value>` | transforms to `Option.none()`     |
| `undefined`       | transforms to `Option.none()`     |
| `e: E`            | transforms to `Option.some(t: T)` |

##### Encoding

| Input               | Output                          |
| ------------------- | ------------------------------- |
| `Option.none()`     | transforms to `<missing value>` |
| `Option.some(t: T)` | transforms back to `e: E`       |

**Example** (Handling Optional Field as Option)

```ts twoslash import.meta.vitest name="basic-optional-with-option-type-1"
import { Schema } from "effect"

const Product = Schema.Struct({
  quantity: Schema.OptionFromOptional(Schema.FiniteFromString),
})

//     ┌─── { readonly quantity?: string | undefined; }
//     ▼
type Encoded = typeof Product.Encoded

//     ┌─── { readonly quantity: Option<number>; }
//     ▼
type Type = typeof Product.Type

console.log(Schema.decodeUnknownSync(Product)({}))
// Output: { quantity: { _id: 'Option', _tag: 'None' } }

console.log(Schema.decodeUnknownSync(Product)({ quantity: undefined }))
// Output: { quantity: { _id: 'Option', _tag: 'None' } }

console.log(Schema.decodeUnknownSync(Product)({ quantity: "2" }))
// Output: { quantity: { _id: 'Option', _tag: 'Some', value: 2 } }
```

#### Exact Optional Key as an Option

`Schema.OptionFromOptionalKey` converts a missing key to `Option.none()` while rejecting `undefined` when the key is present.

##### Decoding

| Input             | Output                            |
| ----------------- | --------------------------------- |
| `<missing value>` | transforms to `Option.none()`     |
| `undefined`       | `SchemaError`                     |
| `e: E`            | transforms to `Option.some(t: T)` |

##### Encoding

| Input               | Output                          |
| ------------------- | ------------------------------- |
| `Option.none()`     | transforms to `<missing value>` |
| `Option.some(t: T)` | transforms back to `e: E`       |

**Example** (Using Exactness with Optional Field as Option)

```ts twoslash
import { Schema } from "effect"

const Product = Schema.Struct({
  quantity: Schema.OptionFromOptionalKey(Schema.FiniteFromString),
})

//     ┌─── { readonly quantity?: string; }
//     ▼
type Encoded = typeof Product.Encoded

//     ┌─── { readonly quantity: Option<number>; }
//     ▼
type Type = typeof Product.Type

console.log(Schema.decodeUnknownSync(Product)({}))
// Output: { quantity: { _id: 'Option', _tag: 'None' } }

console.log(Schema.decodeUnknownSync(Product)({ quantity: "2" }))
// Output: { quantity: { _id: 'Option', _tag: 'Some', value: 2 } }

console.log(Schema.decodeUnknownSync(Product)({ quantity: undefined }))
/*
throws:
SchemaError: Expected string
  at ["quantity"]
*/
```

#### Optional with Nullability

`Schema.OptionFromOptionalNullOr` also treats `null` as `Option.none()`.

##### Decoding

| Input             | Output                            |
| ----------------- | --------------------------------- |
| `<missing value>` | transforms to `Option.none()`     |
| `undefined`       | transforms to `Option.none()`     |
| `null`            | transforms to `Option.none()`     |
| `e: E`            | transforms to `Option.some(t: T)` |

##### Encoding

| Input               | Output                          |
| ------------------- | ------------------------------- |
| `Option.none()`     | transforms to `<missing value>` |
| `Option.some(t: T)` | transforms back to `e: E`       |

**Example** (Handling Null as Missing Value with Optional Field as Option)

```ts twoslash import.meta.vitest name="optional-with-nullability-2"
import { Schema } from "effect"

const Product = Schema.Struct({
  quantity: Schema.OptionFromOptionalNullOr(Schema.FiniteFromString),
})

//     ┌─── { readonly quantity?: string | null | undefined; }
//     ▼
type Encoded = typeof Product.Encoded

//     ┌─── { readonly quantity: Option<number>; }
//     ▼
type Type = typeof Product.Type

console.log(Schema.decodeUnknownSync(Product)({}))
// Output: { quantity: { _id: 'Option', _tag: 'None' } }

console.log(Schema.decodeUnknownSync(Product)({ quantity: undefined }))
// Output: { quantity: { _id: 'Option', _tag: 'None' } }

console.log(Schema.decodeUnknownSync(Product)({ quantity: null }))
// Output: { quantity: { _id: 'Option', _tag: 'None' } }

console.log(Schema.decodeUnknownSync(Product)({ quantity: "2" }))
// Output: { quantity: { _id: 'Option', _tag: 'Some', value: 2 } }
```

#### Exact Optional Nullable Key as an Option

Combine `Schema.optionalKey`, `Schema.NullOr`, and `SchemaGetter.transformOptional` when missing and `null` should become `Option.none()` but `undefined` should be rejected.

##### Decoding

| Input             | Output                            |
| ----------------- | --------------------------------- |
| `<missing value>` | transforms to `Option.none()`     |
| `undefined`       | `SchemaError`                     |
| `null`            | transforms to `Option.none()`     |
| `e: E`            | transforms to `Option.some(t: T)` |

##### Encoding

| Input               | Output                          |
| ------------------- | ------------------------------- |
| `Option.none()`     | transforms to `<missing value>` |
| `Option.some(t: T)` | transforms back to `e: E`       |

**Example** (Using Exactness and Handling Null as Missing Value with Optional Field as Option)

```ts twoslash
import { Option, Predicate, Schema, SchemaGetter } from "effect"

const Product = Schema.Struct({
  quantity: Schema.optionalKey(Schema.NullOr(Schema.FiniteFromString)).pipe(
    Schema.decodeTo(Schema.Option(Schema.Finite), {
      decode: SchemaGetter.transformOptional((o) =>
        Option.some(o.pipe(Option.filter(Predicate.isNotNull))),
      ),
      encode: SchemaGetter.transformOptional(Option.flatten),
    }),
  ),
})

//     ┌─── { readonly quantity?: string | null; }
//     ▼
type Encoded = typeof Product.Encoded

//     ┌─── { readonly quantity: Option<number>; }
//     ▼
type Type = typeof Product.Type

console.log(Schema.decodeUnknownSync(Product)({}))
// Output: { quantity: { _id: 'Option', _tag: 'None' } }

console.log(Schema.decodeUnknownSync(Product)({ quantity: null }))
// Output: { quantity: { _id: 'Option', _tag: 'None' } }

console.log(Schema.decodeUnknownSync(Product)({ quantity: "2" }))
// Output: { quantity: { _id: 'Option', _tag: 'Some', value: 2 } }

console.log(Schema.decodeUnknownSync(Product)({ quantity: undefined }))
/*
throws:
SchemaError: Expected string | null
  at ["quantity"]
*/
```

## Optional Field Transformations

### Optional to Optional

Use `Schema.decodeTo` with `SchemaGetter.transformOptional` to transform an optional encoded field into an optional decoded field. This lets the transformation decide whether the key is present on either side.

One common use case is treating a specific encoded value, such as an empty string, as an absent field in the decoded output.

The decoding and encoding getters receive an `Option`: `None` means the key is absent, and returning `None` omits it from the output.

**Example** (Omitting Empty Strings from the Output)

Consider an optional field of type `string` where empty strings in the input should be removed from the output.

```ts twoslash import.meta.vitest name="optional-to-optional-1"
import { Option, Schema, SchemaGetter } from "effect"

const schema = Schema.Struct({
  nonEmpty: Schema.optionalKey(Schema.String).pipe(
    Schema.decodeTo(Schema.optionalKey(Schema.String), {
      //         ┌─── Option<string>
      //         ▼
      decode: SchemaGetter.transformOptional((maybeString) => {
        if (Option.isNone(maybeString)) {
          // If `maybeString` is `None`, the field is absent in the input.
          // Return Option.none() to omit it in the output.
          return Option.none()
        }
        // Extract the value from the `Some` instance
        const value = maybeString.value
        if (value === "") {
          // Treat empty strings as missing in the output
          // by returning Option.none().
          return Option.none()
        }
        // Include non-empty strings in the output.
        return Option.some(value)
      }),
      // In the encoding phase, you can decide to process the field
      // similarly to the decoding phase or use a different logic.
      // Here, the logic is left unchanged.
      //
      //         ┌─── Option<string>
      //         ▼
      encode: SchemaGetter.transformOptional((maybeString) => maybeString),
    }),
  ),
})

// Decoding examples

const decode = Schema.decodeUnknownSync(schema)

console.log(decode({}))
// Output: {}
console.log(decode({ nonEmpty: "" }))
// Output: {}
console.log(decode({ nonEmpty: "a non-empty string" }))
// Output: { nonEmpty: 'a non-empty string' }

// Encoding examples

const encode = Schema.encodeSync(schema)

console.log(encode({}))
// Output: {}
console.log(encode({ nonEmpty: "" }))
// Output: { nonEmpty: '' }
console.log(encode({ nonEmpty: "a non-empty string" }))
// Output: { nonEmpty: 'a non-empty string' }
```

You can simplify the decoding logic with `Option.filter`, which filters out unwanted values in a concise way.

**Example** (Using `Option.filter` for Decoding)

```ts twoslash
import { identity, Option, Schema, SchemaGetter } from "effect"

const schema = Schema.Struct({
  nonEmpty: Schema.optionalKey(Schema.String).pipe(
    Schema.decodeTo(Schema.optionalKey(Schema.String), {
      decode: SchemaGetter.transformOptional(Option.filter((s) => s !== "")),
      encode: SchemaGetter.transformOptional(identity),
    }),
  ),
})
```

### Optional to Required

Use an optional schema on the encoded side and a required schema on the decoded side. `SchemaGetter.transformOptional` can supply a value when the encoded key is missing and omit selected values during encoding.

**Example** (Setting `null` as Default for Missing Field)

This example provides a `null` value when the encoded field is missing. During encoding, a decoded `null` value omits the field.

```ts twoslash import.meta.vitest name="optional-to-required-1"
import { Option, Schema, SchemaGetter } from "effect"

const schema = Schema.Struct({
  nullable: Schema.optionalKey(
    // Input schema for an optional string
    Schema.String,
  ).pipe(
    Schema.decodeTo(
      // Output schema allowing null or string
      Schema.NullOr(Schema.String),
      {
        //         ┌─── Option<string>
        //         ▼
        decode: SchemaGetter.transformOptional((maybeString) => {
          if (Option.isNone(maybeString)) {
            // If `maybeString` is `None`, the field is absent in the input.
            // Return `null` as the default value for the output.
            return Option.some(null)
          }
          // Extract the value from the `Some` instance
          // and use it as the output.
          return Option.some(maybeString.value)
        }),
        // During encoding, treat `null` as an absent field
        //
        //         ┌─── string | null
        //         ▼
        encode: SchemaGetter.transformOptional((maybeStringOrNull) =>
          Option.flatMap(maybeStringOrNull, (stringOrNull) =>
            stringOrNull === null
              ? // Omit the field by returning `None`
                Option.none()
              : // Include the field by returning `Some`
                Option.some(stringOrNull),
          ),
        ),
      },
    ),
  ),
})

// Decoding examples

const decode = Schema.decodeUnknownSync(schema)

console.log(decode({}))
// Output: { nullable: null }
console.log(decode({ nullable: "a value" }))
// Output: { nullable: 'a value' }

// Encoding examples

const encode = Schema.encodeSync(schema)

console.log(encode({ nullable: "a value" }))
// Output: { nullable: 'a value' }
console.log(encode({ nullable: null }))
// Output: {}
```

You can streamline the decoding and encoding logic using `Option.getOrElse` and `Option.liftPredicate` for concise and readable transformations.

**Example** (Using `Option.getOrElse` and `Option.liftPredicate`)

```ts twoslash
import { Option, Schema, SchemaGetter } from "effect"

const schema = Schema.Struct({
  nullable: Schema.optionalKey(Schema.String).pipe(
    Schema.decodeTo(Schema.NullOr(Schema.String), {
      decode: SchemaGetter.transformOptional(Option.orElseSome(() => null)),
      encode: SchemaGetter.transformOptional(
        Option.filter((value) => value !== null),
      ),
    }),
  ),
})
```

### Required to Optional

Use a required schema on the encoded side and an optional schema on the decoded side. The transformation can omit selected decoded values and must restore a required value during encoding.

**Example** (Handling Empty String as Missing Value)

In this example, the `name` field is required but treated as optional if it is an empty string. During decoding, an empty string in `name` is considered absent, while encoding ensures a value (using an empty string as a default if `name` is absent).

```ts twoslash import.meta.vitest name="required-to-optional-1"
import { Option, Schema, SchemaGetter } from "effect"

const schema = Schema.Struct({
  name: Schema.String.pipe(
    Schema.decodeTo(Schema.optionalKey(Schema.String), {
      //         ┌─── Option<string>
      //         ▼
      decode: SchemaGetter.transformOptional((maybeString) =>
        Option.flatMap(maybeString, (string) => {
          // Treat empty string as a missing value
          if (string === "") {
            // Omit the field by returning `None`
            return Option.none()
          }
          // Otherwise, return the string as is
          return Option.some(string)
        }),
      ),
      //         ┌─── Option<string>
      //         ▼
      encode: SchemaGetter.transformOptional((maybeString) => {
        // Check if the field is missing
        if (Option.isNone(maybeString)) {
          // Provide an empty string as default
          return Option.some("")
        }
        // Otherwise, return the string as is
        return maybeString
      }),
    }),
  ),
})

// Decoding examples

const decode = Schema.decodeUnknownSync(schema)

console.log(decode({ name: "John" }))
// Output: { name: 'John' }
console.log(decode({ name: "" }))
// Output: {}

// Encoding examples

const encode = Schema.encodeSync(schema)

console.log(encode({ name: "John" }))
// Output: { name: 'John' }
console.log(encode({}))
// Output: { name: '' }
```

You can streamline the decoding and encoding logic using `Option.liftPredicate` and `Option.getOrElse` for concise and readable transformations.

**Example** (Using `Option.liftPredicate` and `Option.getOrElse`)

```ts twoslash
import { Option, Schema, SchemaGetter } from "effect"

const schema = Schema.Struct({
  name: Schema.String.pipe(
    Schema.decodeTo(Schema.optionalKey(Schema.String), {
      decode: SchemaGetter.transformOptional((maybeString) =>
        Option.flatMap(
          maybeString,
          Option.liftPredicate((s) => s !== ""),
        ),
      ),
      encode: SchemaGetter.transformOptional((maybeString) =>
        Option.some(Option.getOrElse(maybeString, () => "")),
      ),
    }),
  ),
})
```

## Extending Schemas

Struct schemas expose their `fields`, which you can spread into a new struct or extend with `Schema.fieldsAssign`. Unions expose `mapMembers`, so the same field operation can be applied to every struct member.

<Aside type="tip" title="Retaining Struct Type with Field Spreading">
  By using field spreading with `...Struct.fields`, you maintain the schema's
  `Struct` type, which allows continued access to the `fields` property for
  further modifications.
</Aside>

### Spreading Struct fields

Structs provide access to their fields through the `fields` property, which allows you to extend an existing struct by adding additional fields or combining fields from multiple structs.

**Example** (Adding New Fields)

```ts twoslash
import { Schema } from "effect"

const Original = Schema.Struct({
  a: Schema.String,
  b: Schema.String,
})

const Extended = Schema.Struct({
  ...Original.fields,
  // Adding new fields
  c: Schema.String,
  d: Schema.String,
})

//     ┌─── {
//     |      readonly a: string;
//     |      readonly b: string;
//     |      readonly c: string;
//     |      readonly d: string;
//     |    }
//     ▼
type Type = typeof Extended.Type
```

**Example** (Adding Additional Index Signatures)

```ts twoslash
import { Schema } from "effect"

const Original = Schema.Struct({
  a: Schema.String,
  b: Schema.String,
})

const Extended = Schema.StructWithRest(
  Schema.Struct(Original.fields),
  // Adding an index signature
  [Schema.Record(Schema.String, Schema.String)],
)

//     ┌─── {
//     │      readonly [x: string]: string;
//     |      readonly a: string;
//     |      readonly b: string;
//     |    }
//     ▼
type Type = typeof Extended.Type
```

**Example** (Combining Fields from Multiple Structs)

```ts twoslash
import { Schema } from "effect"

const Struct1 = Schema.Struct({
  a: Schema.String,
  b: Schema.String,
})

const Struct2 = Schema.Struct({
  c: Schema.String,
  d: Schema.String,
})

const Extended = Schema.Struct({
  ...Struct1.fields,
  ...Struct2.fields,
})

//     ┌─── {
//     |      readonly a: string;
//     |      readonly b: string;
//     |      readonly c: string;
//     |      readonly d: string;
//     |    }
//     ▼
type Type = typeof Extended.Type
```

### The fieldsAssign Function

`Schema.fieldsAssign(fields)` is a concise form of `struct.mapFields(Struct.assign(fields))`. Use it directly on a struct, or map it over every member of a union.

**Example** (Adding Fields to Every Union Member)

```ts twoslash
import { Schema, Tuple } from "effect"

const Struct = Schema.Struct({
  a: Schema.String,
})

const UnionOfStructs = Schema.Union([
  Schema.Struct({ b: Schema.String }),
  Schema.Struct({ c: Schema.String }),
])

const Extended = UnionOfStructs.mapMembers(
  Tuple.map(Schema.fieldsAssign(Struct.fields)),
)

//     ┌─── {
//     |        readonly a: string;
//     |    } & ({
//     |        readonly b: string;
//     |    } | {
//     |        readonly c: string;
//     |    })
//     ▼
type Type = typeof Extended.Type
```

## Renaming Properties

### Renaming a Property During Definition

To use a different key in the encoded representation, apply `Schema.encodeKeys` after defining the struct.

**Example** (Renaming a Required Property)

```ts twoslash import.meta.vitest name="renaming-a-property-during-definition-1"
import { Schema } from "effect"

const schema = Schema.Struct({
  a: Schema.String,
  b: Schema.Finite,
}).pipe(Schema.encodeKeys({ a: "c" }))

//     ┌─── { readonly c: string; readonly b: number; }
//     ▼
type Encoded = typeof schema.Encoded

//     ┌─── { readonly a: string; readonly b: number; }
//     ▼
type Type = typeof schema.Type

console.log(Schema.decodeUnknownSync(schema)({ c: "c", b: 1 }))
// Output: { a: "c", b: 1 }
```

**Example** (Renaming an Optional Property)

```ts twoslash import.meta.vitest name="renaming-a-property-during-definition-2"
import { Schema } from "effect"

const schema = Schema.Struct({
  a: Schema.optional(Schema.String),
  b: Schema.Finite,
}).pipe(Schema.encodeKeys({ a: "c" }))

//     ┌─── { readonly b: number; readonly c?: string | undefined; }
//     ▼
type Encoded = typeof schema.Encoded

//     ┌─── { readonly a?: string | undefined; readonly b: number; }
//     ▼
type Type = typeof schema.Type

console.log(Schema.decodeUnknownSync(schema)({ c: "c", b: 1 }))
// Output: { a: 'c', b: 1 }

console.log(Schema.decodeUnknownSync(schema)({ b: 1 }))
// Output: { b: 1 }
```

### Renaming Properties of an Existing Schema

For an existing struct, rename its decoded fields with `mapFields`, then use `Schema.encodeKeys` to preserve the original names in the encoded representation. For a union, apply the same operation to each member.

**Example** (Renaming Properties in a Struct Schema)

```ts twoslash import.meta.vitest name="renaming-properties-of-an-existing-schema-1"
import { Schema, Struct } from "effect"

const Original = Schema.Struct({
  c: Schema.String,
  b: Schema.Finite,
})

// Renaming the "c" property to "a"
//
//
//      ┌─── Struct<{
//      |      readonly a: string;
//      |      readonly b: number;
//      |    }>
//      ▼
const Renamed = Original.mapFields((fields) => ({
  a: fields.c,
  ...Struct.omit(fields, ["c"]),
})).pipe(Schema.encodeKeys({ a: "c" }))

console.log(Schema.decodeUnknownSync(Renamed)({ c: "c", b: 1 }))
// Output: { a: "c", b: 1 }
```

**Example** (Renaming Properties in Union Schemas)

```ts twoslash import.meta.vitest name="renaming-properties-of-an-existing-schema-2"
import { Schema } from "effect"

const Original = Schema.Union([
  Schema.Struct({
    a: Schema.String,
    b: Schema.Finite,
  }),
  Schema.Struct({
    a: Schema.String,
    d: Schema.Boolean,
  }),
])

// Use "c" for "a" in the encoded representation of every member
const Renamed = Original.mapMembers(
  ([first, second]) =>
    [
      first.pipe(Schema.encodeKeys({ a: "c" })),
      second.pipe(Schema.encodeKeys({ a: "c" })),
    ] as const,
)

console.log(Schema.decodeUnknownSync(Renamed)({ c: "c", b: 1 }))
// Output: { a: "c", b: 1 }

console.log(Schema.decodeUnknownSync(Renamed)({ c: "c", d: false }))
// Output: { a: "c", d: false }
```

## Recursive Schemas

The `Schema.suspend` function is designed for defining schemas that reference themselves, such as in recursive data structures.

**Example** (Self-Referencing Schema)

In this example, the `Category` schema references itself through the `subcategories` field, which is an array of `Category` objects.

```ts twoslash
import { Schema } from "effect"

interface Category {
  readonly name: string
  readonly subcategories: ReadonlyArray<Category>
}

const Category = Schema.Struct({
  name: Schema.String,
  subcategories: Schema.Array(
    Schema.suspend((): Schema.Codec<Category> => Category),
  ),
})
```

<Aside type="note" title="Correct Inference">
  It is necessary to define the `Category` type and add an explicit type
  annotation because otherwise TypeScript would struggle to infer types
  correctly. Without this annotation, you might encounter the error message:
</Aside>

**Example** (Type Inference Error)

```ts twoslash
import { Schema } from "effect"

// @errors: 7022
const Category = Schema.Struct({
  name: Schema.String,
  // @errors: 7022 7024
  subcategories: Schema.Array(Schema.suspend(() => Category)),
})
```

### A Helpful Pattern to Simplify Schema Definition

As we've observed, it's necessary to define an interface for the `Type` of the schema to enable recursive schema definition, which can complicate things and be quite tedious.
One pattern to mitigate this is to **separate the field responsible for recursion** from all other fields.

**Example** (Separating Recursive Fields)

```ts twoslash
import { Schema } from "effect"

const fields = {
  name: Schema.String,
  // ...other fields as needed
}

// Define an interface for the Category schema,
// extending the Type of the defined fields
interface Category extends Schema.Struct.Type<typeof fields> {
  // Define `subcategories` using recursion
  readonly subcategories: ReadonlyArray<Category>
}

const Category = Schema.Struct({
  ...fields, // Spread in the base fields
  subcategories: Schema.Array(
    // Define `subcategories` using recursion
    Schema.suspend((): Schema.Codec<Category> => Category),
  ),
})
```

### Mutually Recursive Schemas

You can also use `Schema.suspend` to create mutually recursive schemas, where two schemas reference each other. In the following example, `Expression` and `Operation` form a simple arithmetic expression tree by referencing each other.

**Example** (Defining Mutually Recursive Schemas)

```ts twoslash
import { Schema } from "effect"

interface Expression {
  readonly type: "expression"
  readonly value: number | Operation
}

interface Operation {
  readonly type: "operation"
  readonly operator: "+" | "-"
  readonly left: Expression
  readonly right: Expression
}

const Expression = Schema.Struct({
  type: Schema.Literal("expression"),
  value: Schema.Union([
    Schema.Finite,
    Schema.suspend((): Schema.Codec<Operation> => Operation),
  ]),
})

const Operation = Schema.Struct({
  type: Schema.Literal("operation"),
  operator: Schema.Literals(["+", "-"]),
  left: Expression,
  right: Expression,
})
```

### Recursive Types with Different Encoded and Type

Defining a recursive schema where the `Encoded` type differs from the `Type` type adds another layer of complexity. In such cases, we need to define two interfaces: one for the `Type` type, as seen previously, and another for the `Encoded` type.

**Example** (Recursive Schema with Different Encoded and Type Definitions)

Let's consider an example with an `id` field defined by `Schema.FiniteFromString`.
Its `Type` is `number`, while its `Encoded` type is `string`.
When we add this field to the `Category` schema, TypeScript raises an error:

```ts twoslash
import { Schema } from "effect"

const fields = {
  id: Schema.FiniteFromString,
  name: Schema.String,
}

interface Category extends Schema.Struct.Type<typeof fields> {
  readonly subcategories: ReadonlyArray<Category>
}

const Category = Schema.Struct({
  ...fields,
  subcategories: Schema.Array(
    // @errors: 2322
    Schema.suspend((): Schema.Codec<Category> => Category),
  ),
})
```

This fails because `Schema.Codec<Category>` defaults the encoded type to `Category`. The recursive edge must also specify `CategoryEncoded`:

```ts twoslash
import { Schema } from "effect"

const fields = {
  id: Schema.FiniteFromString,
  name: Schema.String,
}

interface Category extends Schema.Struct.Type<typeof fields> {
  readonly subcategories: ReadonlyArray<Category>
}

interface CategoryEncoded extends Schema.Struct.Encoded<typeof fields> {
  readonly subcategories: ReadonlyArray<CategoryEncoded>
}

const Category = Schema.Struct({
  ...fields,
  subcategories: Schema.Array(
    Schema.suspend((): Schema.Codec<Category, CategoryEncoded> => Category),
  ),
})
```
