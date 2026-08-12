---
title: Schema Annotations
description: Learn how to enhance schemas with annotations for better customization, error handling, documentation, and concurrency control in your Effect-based applications.
sidebar:
  label: Annotations
  order: 8
---

Schema AST nodes can carry optional metadata called annotations. Use the `.annotate(...)` method or `Schema.annotate(...)` for the decoded side, `Schema.annotateEncoded(...)` for the encoded side, and `Schema.annotateKey(...)` for a struct field or tuple element.

**Example** (Using Annotations to Customize Schema)

```ts twoslash import.meta.vitest name="schema-annotations-1"
import { Schema } from "effect"

// Define a Password schema, starting with a string type
const Password = Schema.String
  // Add a custom error message for non-string values
  .annotate({ message: "not a string" })
  .pipe(
    // Enforce non-empty strings and provide a custom error message
    Schema.check(
      Schema.isNonEmpty({ message: "required" }),
      // Restrict the string length to 10 characters or fewer
      // with a custom error message for exceeding length
      Schema.makeFilter((s) =>
        s.length <= 10 ? undefined : "must be at most 10 characters long",
      ),
    ),
  )
  .annotate({
    // Add a unique identifier for the schema
    identifier: "Password",
    // Provide a title for the schema
    title: "password",
    // Include a description explaining what this schema represents
    description: "A password is a secret string used to authenticate a user",
    // Add examples for better clarity
    examples: ["1Ki77y", "jelly22fi$h"],
    // Include any additional documentation
    documentation: `...technical information on Password schema...`,
  })
```

## Built-in Annotations

The available annotations depend on the kind of schema node. These are the most common ones:

| Annotation             | Scope                 | Description                                                                                            |
| ---------------------- | --------------------- | ------------------------------------------------------------------------------------------------------ |
| `identifier`           | schema                | Stable name used by schema interpreters, including JSON Schema references and expected-value messages. |
| `expected`             | schema or check       | Human-readable description used by the default error formatter.                                        |
| `title`                | schema or key         | Short display title, also understood by JSON Schema tooling.                                           |
| `description`          | schema or key         | Longer documentation for the represented value.                                                        |
| `documentation`        | schema or key         | Additional developer-facing documentation.                                                             |
| `examples`             | schema or key         | Example decoded values; this is metadata and does not validate them.                                   |
| `default`              | schema or key         | A documented default value; it does not change decoding or construction behavior.                      |
| `message`              | schema or check       | Replaces the default message for matching failures.                                                    |
| `messageMissingKey`    | key                   | Replaces the error message when a required key is absent.                                              |
| `messageUnexpectedKey` | schema                | Replaces the message for excess keys when `onExcessProperty` is `"error"`.                             |
| `parseOptions`         | schema                | Overrides [parse options](/docs/v4/schema/getting-started#parse-options) for that schema node.         |
| `toJsonSchema`         | check                 | Describes a custom check to the [JSON Schema](/docs/v4/schema/json-schema) interpreter.                |
| `toArbitrary`          | schema or declaration | Customizes [Arbitrary](/docs/v4/schema/arbitrary) generation.                                          |
| `toFormatter`          | declaration           | Defines [Formatter](/docs/v4/schema/formatter) behavior for a custom declaration.                      |
| `toEquivalence`        | declaration           | Defines [Equivalence](/docs/v4/schema/equivalence) behavior for a custom declaration.                  |
| `toCodecJson`          | declaration           | Defines how a custom declaration is represented by the JSON codec interpreter.                         |

## Concurrency Parse Option

For schemas like `Struct`, `Array`, or `Union` that contain multiple effectful schemas, the `concurrency` parse option controls how many parsing effects may run concurrently.

```ts showLineNumbers=false
type Concurrency = number | "unbounded" | undefined
```

Here's a shorter version presented in a table:

| Value         | Description                                    |
| ------------- | ---------------------------------------------- |
| `number`      | Limits the maximum number of concurrent tasks. |
| `"unbounded"` | All tasks run concurrently with no limit.      |
| `undefined`   | At most one task runs at a time (the default). |

**Example** (Sequential Execution)

In this example, we define three tasks that simulate asynchronous operations with different durations. Since no concurrency is specified, the tasks are executed sequentially, one after the other.

```ts twoslash import.meta.vitest name="concurrency-annotation-1"
import { Schema, SchemaGetter } from "effect"
import type { Duration } from "effect"
import { Effect } from "effect"

// Simulates an async task
const item = (id: number, duration: Duration.Input) =>
  Schema.String.pipe(
    Schema.decode({
      decode: SchemaGetter.checkEffect(() =>
        Effect.gen(function* () {
          yield* Effect.sleep(duration)
          console.log(`Task ${id} done`)
          return true
        }),
      ),
      encode: SchemaGetter.passthrough(),
    }),
  )

const Sequential = Schema.Tuple([
  item(1, "30 millis"),
  item(2, "10 millis"),
  item(3, "20 millis"),
])

Effect.runPromise(Schema.decodeEffect(Sequential)(["a", "b", "c"]))
/*
Output:
Task 1 done
Task 2 done
Task 3 done
*/
```

**Example** (Concurrent Execution)

By passing `{ concurrency: "unbounded" }` to the interpreter, the tasks can run concurrently instead of waiting for one another.

```ts twoslash import.meta.vitest name="concurrency-annotation-2"
import { Schema, SchemaGetter } from "effect"
import type { Duration } from "effect"
import { Effect } from "effect"

// Simulates an async task
const item = (id: number, duration: Duration.Input) =>
  Schema.String.pipe(
    Schema.decode({
      decode: SchemaGetter.checkEffect(() =>
        Effect.gen(function* () {
          yield* Effect.sleep(duration)
          console.log(`Task ${id} done`)
          return true
        }),
      ),
      encode: SchemaGetter.passthrough(),
    }),
  )

const Concurrent = Schema.Tuple([
  item(1, "30 millis"),
  item(2, "10 millis"),
  item(3, "20 millis"),
])

Effect.runPromise(
  Schema.decodeEffect(Concurrent, { concurrency: "unbounded" })([
    "a",
    "b",
    "c",
  ]),
)
/*
Output:
Task 2 done
Task 3 done
Task 1 done
*/
```

## Handling Decoding Errors with Fallbacks

`Schema.catchDecoding` lets you recover from a decoding issue with fallback logic.

```ts showLineNumbers=false
type DecodingFallback<T> = (
  issue: SchemaIssue.Issue,
) => Effect.Effect<Option.Option<T>, SchemaIssue.Issue>
```

This annotation enables you to specify fallback behavior when decoding fails, making it possible to recover gracefully from errors.

**Example** (Basic Fallback)

In this basic example, when decoding fails (e.g., the input is `null`), the fallback value is returned instead of an error.

```ts twoslash import.meta.vitest name="handling-decoding-errors-with-fallbacks-1"
import { Schema } from "effect"
import { Effect } from "effect"

// Schema with a fallback value
const schema = Schema.String.pipe(
  Schema.catchDecoding(() => Effect.succeedSome("<fallback>")),
)

console.log(Schema.decodeUnknownSync(schema)("valid input"))
// Output: valid input

console.log(Schema.decodeUnknownSync(schema)(null))
// Output: <fallback>
```

**Example** (Advanced Fallback with Logging)

In this advanced example, when a decoding error occurs, the schema logs the issue and then returns a fallback value.
This demonstrates how you can incorporate logging and other side effects during error handling.

```ts twoslash import.meta.vitest name="handling-decoding-errors-with-fallbacks-2"
import { Schema } from "effect"
import { Effect } from "effect"

// Schema with logging and fallback
const schemaWithLog = Schema.String.pipe(
  Schema.catchDecoding((issue) =>
    Effect.gen(function* () {
      // Log the error issue
      yield* Effect.log(issue._tag)
      // Simulate a delay
      yield* Effect.sleep(10)
      // Return a fallback value
      return yield* Effect.succeedSome("<fallback>")
    }),
  ),
)

// Run the effectful fallback logic
Effect.runPromise(Schema.decodeUnknownEffect(schemaWithLog)(null)).then(
  console.log,
)
/*
Output:
timestamp=... level=INFO fiber=#0 message=InvalidType
<fallback>
*/
```

## Custom Annotations

In addition to built-in annotations, you can define custom annotations to meet specific requirements. For instance, here's how to create a `deprecated` annotation:

**Example** (Defining a Custom Annotation)

```ts twoslash import.meta.vitest name="custom-annotations-1"
import { Schema } from "effect"

// Define a unique identifier for your custom annotation
const DeprecatedId = Symbol.for(
  "some/unique/identifier/for/your/custom/annotation",
)

// Apply the custom annotation to the schema
const MyString = Schema.String.annotate({ [DeprecatedId]: true })
```

To make your new custom annotation type-safe, you can use a module augmentation. In the next example, we want our custom annotation to be a boolean.

**Example** (Adding Type Safety to Custom Annotations)

```ts twoslash
import { Schema } from "effect"

const DeprecatedId = Symbol.for(
  "some/unique/identifier/for/your/custom/annotation",
)

// Module augmentation
declare module "effect/Schema" {
  namespace Annotations {
    interface Annotations {
      [DeprecatedId]?: boolean
    }
  }
}

const MyString = Schema.String.annotate({
  // @errors: 2418
  [DeprecatedId]: "bad value",
})
```

You can retrieve custom annotations using the `Schema.resolveAnnotations` helper function.

**Example** (Retrieving a Custom Annotation)

```ts twoslash collapse={3-15} import.meta.vitest name="custom-annotations-3"
import { Schema } from "effect"

const DeprecatedId = Symbol.for(
  "some/unique/identifier/for/your/custom/annotation",
)

declare module "effect/Schema" {
  namespace Annotations {
    interface Annotations {
      [DeprecatedId]?: boolean
    }
  }
}

const MyString = Schema.String.annotate({ [DeprecatedId]: true })

// Helper function to check if a schema is marked as deprecated
const isDeprecated = (schema: Schema.Top): boolean =>
  Schema.resolveAnnotations(schema)?.[DeprecatedId] ?? false

console.log(isDeprecated(Schema.String))
// Output: false

console.log(isDeprecated(MyString))
// Output: true
```
