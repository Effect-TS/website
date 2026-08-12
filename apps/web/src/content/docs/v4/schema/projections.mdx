---
title: Schema Projections
description: Create new schemas by extracting and customizing the Type or Encoded components of existing schemas.
sidebar:
  label: Projections
  order: 6
---

Sometimes, you may want to create a new schema based on an existing one, focusing specifically on either its `Type` or `Encoded` aspect. The Schema module provides several functions to make this possible.

## toType

`Schema.toType` extracts the decoded side of a schema. The result has the original `Type` as both its `Type` and `Encoded`, requires no services, and discards the encoding path.

**Function Signature**

```ts showLineNumbers=false
declare const toType: <S extends Schema.Constraint>(
  schema: S,
) => Schema.toType<S>
```

**Example** (Extracting Only Type-Specific Properties)

```ts twoslash import.meta.vitest name="totype-1"
import { Schema } from "effect"

const Original = Schema.Struct({
  quantity: Schema.FiniteFromString.check(Schema.isGreaterThanOrEqualTo(2)),
})

// This creates a schema where 'quantity' is defined as a number
// that must be greater than or equal to 2.
const TypeSchema = Schema.toType(Original)

// TypeSchema is equivalent to:
const TypeSchema2 = Schema.Struct({
  quantity: Schema.Finite.check(Schema.isGreaterThanOrEqualTo(2)),
})

Schema.decodeUnknownSync(TypeSchema)({ quantity: 5 }) // => { quantity: 5 }
```

## toEncoded

`Schema.toEncoded` extracts the encoded side of a schema. The result has the original `Encoded` as both its `Type` and `Encoded`, requires no services, and discards the decoding path while preserving checks that apply to the encoded representation.

**Function Signature**

```ts showLineNumbers=false
declare const toEncoded: <S extends Schema.Constraint>(
  schema: S,
) => Schema.toEncoded<S>
```

**Example** (Retaining Initial Refinements Only)

```ts twoslash import.meta.vitest name="toencoded-2"
import { Schema } from "effect"

const Original = Schema.Struct({
  foo: Schema.String.check(Schema.isMinLength(3)).pipe(
    Schema.decodeTo(Schema.Trim),
  ),
})

// The EncodedSchema preserves the minLength(3) check,
// ensuring the string length condition is enforced
// but omits the Schema.Trim transformation.
const EncodedSchema = Schema.toEncoded(Original)

// EncodedSchema is equivalent to:
const EncodedSchema2 = Schema.Struct({
  foo: Schema.String.check(Schema.isMinLength(3)),
})

Schema.decodeUnknownSync(EncodedSchema)({ foo: "abcd" }) // => { foo: "abcd" }
```
