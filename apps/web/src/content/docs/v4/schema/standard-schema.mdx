---
title: Schema to Standard Schema
description: Generate Standard Schema V1.
sidebar:
  label: Standard Schema
  order: 14
---

import { Aside } from "@astrojs/starlight/components"

`Schema.toStandardSchemaV1` exposes an Effect schema through the [Standard Schema V1](https://standardschema.dev/) interface. The resulting object can be passed to libraries that support the standard while retaining the original Effect schema APIs.

**Example** (Generating a Standard Schema V1)

```ts twoslash import.meta.vitest name="schema-to-standard-schema-1"
import { Schema } from "effect"

const schema = Schema.Struct({
  name: Schema.String,
})

// Convert an Effect schema into a Standard Schema V1 object
const standardSchema = Schema.toStandardSchemaV1(schema)

standardSchema["~standard"].vendor // => "effect"
```

<Aside type="note" title="Schema Restrictions">
  The schema must not require decoding services: its `DecodingServices` must be
  `never`.
</Aside>

## Sync vs Async Validation

The Standard Schema `validate` method first attempts to decode synchronously. If decoding encounters an asynchronous transformation or check, it returns a `Promise` instead.

**Example** (Handling Synchronous and Asynchronous Validation)

```ts twoslash import.meta.vitest name="sync-vs-async-validation-1"
import { Effect, Schema, SchemaGetter } from "effect"

// Utility function to display sync and async results
const print = <T>(t: T) =>
  t instanceof Promise
    ? t.then((x) => console.log("Promise", JSON.stringify(x, null, 2)))
    : console.log("Value", JSON.stringify(t, null, 2))

// Define a synchronous schema
const sync = Schema.Struct({
  name: Schema.String,
})

// Generate a Standard Schema V1 object
const syncStandardSchema = Schema.toStandardSchemaV1(sync)

// Validate synchronously
print(syncStandardSchema["~standard"].validate({ name: null }))
syncStandardSchema["~standard"].validate({ name: null }) // => { issues: [{ path: ["name"], message: "Expected string" }] }
/*
Output:
{
  "issues": [
    {
      "path": [
        "name"
      ],
      "message": "Expected string"
    }
  ]
}
*/

// Define an asynchronous schema with a transformation
const async = sync.pipe(
  Schema.decodeTo(
    Schema.Struct({
      name: Schema.NonEmptyString,
    }),
    {
      // Simulate an asynchronous validation delay
      decode: SchemaGetter.transformOrFail((x) =>
        Effect.sleep("100 millis").pipe(Effect.as(x)),
      ),
      encode: SchemaGetter.passthrough(),
    },
  ),
)

// Generate a Standard Schema V1 object
const asyncStandardSchema = Schema.toStandardSchemaV1(async)

// Validate asynchronously
print(asyncStandardSchema["~standard"].validate({ name: "" }))
await asyncStandardSchema["~standard"].validate({ name: "" }) // => { issues: [{ path: ["name"], message: "Expected a value with a length of at least 1" }] }
/*
Output:
Promise {
  "issues": [
    {
      "path": [
        "name"
      ],
      "message": "Expected a value with a length of at least 1"
    }
  ]
}
*/
```

## Defects

If an unexpected defect occurs during validation, it is reported as a single issue without a `path`. This ensures that unexpected errors do not disrupt schema validation but are still captured and reported.

**Example** (Handling Defects)

```ts twoslash import.meta.vitest name="defects-1"
import { Effect, Schema, SchemaGetter } from "effect"

// Define a schema with a defect in the decode function
const defect = Schema.String.pipe(
  Schema.decodeTo(Schema.String, {
    // Simulate an internal failure
    decode: SchemaGetter.transformOrFail(() => Effect.die("Boom!")),
    encode: SchemaGetter.passthrough(),
  }),
)

// Generate a Standard Schema V1 object
const defectStandardSchema = Schema.toStandardSchemaV1(defect)

// Validate input, triggering a defect
console.log(defectStandardSchema["~standard"].validate("a"))
/*
Output:
{ issues: [ { message: 'Error: Boom!' } ] }
*/
```

Standard Schema failures use the same formatter described in [Error Formatters](/docs/v4/schema/error-formatters/#standard-schema-v1-formatter). Pass `leafHook`, `checkHook`, or `parseOptions` to `Schema.toStandardSchemaV1` to customize its output.
