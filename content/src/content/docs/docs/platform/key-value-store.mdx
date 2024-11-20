---
title: KeyValueStore
description: Manage key-value pairs with asynchronous, consistent storage, supporting in-memory, file system, and schema-based implementations.
sidebar:
  order: 3
---

The `@effect/platform/KeyValueStore` module provides a robust and effectful interface for managing key-value pairs.
It supports asynchronous operations, ensuring data integrity and consistency, and includes built-in implementations for in-memory, file system-based, and schema-validated stores.

## Basic Usage

The module provides a single `KeyValueStore` [tag](/docs/requirements-management/services/), which acts as the gateway for interacting with the store.

**Example** (Accessing the KeyValueStore Service)

```ts twoslash
import { KeyValueStore } from "@effect/platform"
import { Effect } from "effect"

const program = Effect.gen(function* () {
  const kv = yield* KeyValueStore.KeyValueStore

  // Use `kv` to perform operations on the store
})
```

The `KeyValueStore` interface includes the following operations:

| Operation            | Description                                                          |
| -------------------- | -------------------------------------------------------------------- |
| **get**              | Returns the value as `string` of the specified key if it exists.     |
| **getUint8Array**    | Returns the value as `Uint8Array` of the specified key if it exists. |
| **set**              | Sets the value of the specified key.                                 |
| **remove**           | Removes the specified key.                                           |
| **clear**            | Removes all entries.                                                 |
| **size**             | Returns the number of entries.                                       |
| **modify**           | Updates the value of the specified key if it exists.                 |
| **modifyUint8Array** | Updates the value of the specified key if it exists.                 |
| **has**              | Check if a key exists.                                               |
| **isEmpty**          | Check if the store is empty.                                         |
| **forSchema**        | Create a [SchemaStore](#schemastore) for the specified schema.       |

**Example** (Working with Key-Value Pairs)

```ts twoslash
import {
  KeyValueStore,
  layerMemory
} from "@effect/platform/KeyValueStore"
import { Effect } from "effect"

const program = Effect.gen(function* () {
  const kv = yield* KeyValueStore

  // Initially, the store is empty
  console.log(yield* kv.size)

  // Set a key-value pair
  yield* kv.set("key", "value")
  console.log(yield* kv.size)

  // Retrieve the value for the specified key
  const value = yield* kv.get("key")
  console.log(value)

  // Remove the key-value pair
  yield* kv.remove("key")
  console.log(yield* kv.size)
})

// Provide an in-memory KeyValueStore implementation
Effect.runPromise(program.pipe(Effect.provide(layerMemory)))
/*
Output:
0
1
{ _id: 'Option', _tag: 'Some', value: 'value' }
0
*/
```

## Built-in Implementations

The module provides several built-in implementations of the `KeyValueStore` interface, available as [layers](/docs/requirements-management/layers/), to suit different needs:

| Implementation        | Description                                                                                               |
| --------------------- | --------------------------------------------------------------------------------------------------------- |
| **In-Memory Store**   | `layerMemory` provides a simple, in-memory key-value store, ideal for lightweight or testing scenarios.   |
| **File System Store** | `layerFileSystem` offers a file-based store for persistent storage needs.                                 |
| **Schema Store**      | `layerSchema` enables schema-based validation for stored values, ensuring data integrity and type safety. |

## SchemaStore

The `SchemaStore` interface allows you to validate and parse values according to a defined [schema](/docs/schema/introduction/).
This ensures that all data stored in the key-value store adheres to the specified structure, enhancing data integrity and type safety.

**Example** (Using Schema Validation in KeyValueStore)

```ts twoslash
import {
  KeyValueStore,
  layerMemory
} from "@effect/platform/KeyValueStore"
import { Effect, Schema } from "effect"

// Define a schema for the values
const Person = Schema.Struct({
  name: Schema.String,
  age: Schema.Number
})

const program = Effect.gen(function* () {
  // Create a SchemaStore based on the Person schema
  const kv = (yield* KeyValueStore).forSchema(Person)

  // Add a value that adheres to the schema
  const value = { name: "Alice", age: 30 }
  yield* kv.set("user1", value)
  console.log(yield* kv.size)

  // Retrieve and log the value
  console.log(yield* kv.get("user1"))
})

// Use the in-memory store implementation
Effect.runPromise(program.pipe(Effect.provide(layerMemory)))
/*
Output:
1
{ _id: 'Option', _tag: 'Some', value: { name: 'Alice', age: 30 } }
*/
```
