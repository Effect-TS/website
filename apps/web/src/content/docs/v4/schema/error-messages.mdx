---
title: Error Messages
description: Customize and enhance error messages for schema decoding with default, refined, and custom messages.
sidebar:
  order: 9
---

## Default Error Messages

By default, a `SchemaError` formats its issue with a concise message and a path when the failure is nested (see [Error Formatters](/docs/v4/schema/error-formatters)).
For example, if a required property is missing or a value has the wrong type, the message states what was expected and where the failure occurred.

**Example** (Type Mismatch)

```ts twoslash
import { Schema } from "effect"

const Person = Schema.Struct({
  name: Schema.String,
  age: Schema.Finite,
})

Schema.decodeUnknownSync(Person)(null)
// throws: SchemaError: Expected object
```

**Example** (Missing Properties)

```ts twoslash
import { Schema } from "effect"

const Person = Schema.Struct({
  name: Schema.String,
  age: Schema.Finite,
})

Schema.decodeUnknownSync(Person)({}, { errors: "all" })
/*
throws:
SchemaError: Missing key
  at ["name"]
Missing key
  at ["age"]
*/
```

**Example** (Incorrect Property Type)

```ts twoslash
import { Schema } from "effect"

const Person = Schema.Struct({
  name: Schema.String,
  age: Schema.Finite,
})

Schema.decodeUnknownSync(Person)({ name: null, age: "age" }, { errors: "all" })
/*
throws:
SchemaError: Expected string
  at ["name"]
Expected number
  at ["age"]
*/
```

### Enhancing Clarity in Error Messages with Identifiers

In scenarios where a schema has multiple fields or nested structures, the default error messages can become overly complex and verbose.
To address this, you can enhance the clarity and brevity of these messages by utilizing annotations such as `identifier`, `title`, and `description`.

**Example** (Using Identifiers for Clarity)

```ts twoslash
import { Schema } from "effect"

const Name = Schema.String.annotate({ identifier: "Name" })

const Age = Schema.Finite.annotate({ identifier: "Age" })

const Person = Schema.Struct({
  name: Name,
  age: Age,
}).annotate({ identifier: "Person" })

Schema.decodeUnknownSync(Person)(null)
/*
throws:
SchemaError: Expected Person
*/

Schema.decodeUnknownSync(Person)({}, { errors: "all" })
/*
throws:
SchemaError: Missing key
  at ["name"]
Missing key
  at ["age"]
*/

Schema.decodeUnknownSync(Person)({ name: null, age: null }, { errors: "all" })
/*
throws:
SchemaError: Expected Name
  at ["name"]
Expected Age
  at ["age"]
*/
```

### Checks

A check runs only after the base schema accepts the input. Base-type failures and check failures therefore have distinct messages.

**Example** (Base-Type and Check Errors)

```ts twoslash
import { Schema } from "effect"

const Name = Schema.String.check(
  Schema.isNonEmpty({ expected: "a non-empty name" }),
)

const Person = Schema.Struct({
  name: Name,
}).annotate({ identifier: "Person" })

// The base string schema rejects null before the check runs
Schema.decodeUnknownSync(Person)({ name: null })
/*
throws:
SchemaError: Expected string
  at ["name"]
*/

// The input is a string, so the non-empty check runs and fails
Schema.decodeUnknownSync(Person)({ name: "" })
/*
throws:
SchemaError: Expected a non-empty name
  at ["name"]
*/
```

### Transformations

Transformations between different types or formats can occasionally result in errors.
The system provides a structured error message to specify where the error occurred:

- **Encoded Side Failure:** Errors on this side typically indicate that the input to the transformation does not match the expected initial type or format. For example, receiving a `null` when a `string` is expected.
- **Transformation Process Failure:** This type of error arises when the transformation logic itself fails, such as when the input does not meet the criteria specified within the transformation functions.
- **Type Side Failure:** Occurs when the output of a transformation does not meet the schema requirements on the decoded side. This can happen if the transformed value fails subsequent validations or conditions.

**Example** (Transformation Errors)

```ts twoslash
import { Effect, Schema, SchemaGetter, SchemaIssue } from "effect"

const schema = Schema.String.pipe(
  Schema.decodeTo(Schema.String.check(Schema.isMinLength(2)), {
    decode: SchemaGetter.transformOrFail((s) =>
      s.length > 0
        ? Effect.succeed(s)
        : Effect.fail(new SchemaIssue.InvalidValue()),
    ),
    encode: SchemaGetter.passthrough(),
  }),
)

// Encoded side failure
Schema.decodeUnknownSync(schema)(null)
/*
throws:
SchemaError: Expected string
*/

// transformation failure
Schema.decodeUnknownSync(schema)("")
/*
throws:
SchemaError: Expected a valid value
*/

// Type side failure
Schema.decodeUnknownSync(schema)("a")
/*
throws:
SchemaError: Expected a value with a length of at least 2
*/
```

## Custom Error Messages

Use the `message` annotation to replace the default message for a schema node or check.

```ts showLineNumbers=false
type MessageAnnotation = string
```

**Example** (Adding a Custom Error Message to a String Schema)

```ts twoslash
import { Schema } from "effect"

// Define a string schema without a custom message
const MyString = Schema.String

// Attempt to decode `null`, resulting in a default error message
Schema.decodeUnknownSync(MyString)(null)
/*
throws:
SchemaError: Expected string
*/

// Define a string schema with a custom error message
const MyStringWithMessage = Schema.String.annotate({
  message: "not a string",
})

// Decode with the custom schema, showing the new error message
Schema.decodeUnknownSync(MyStringWithMessage)(null)
/*
throws:
SchemaError: not a string
*/
```

**Example** (Custom Error Message for a Union Schema)

```ts twoslash
import { Schema } from "effect"

// Define a union schema without a custom message
const MyUnion = Schema.Union([Schema.String, Schema.Finite])

// Decode `null`, resulting in default union error messages
Schema.decodeUnknownSync(MyUnion)(null)
/*
throws:
SchemaError: Expected string | number
*/

// Define a union schema with a custom message
const MyUnionWithMessage = Schema.Union([
  Schema.String,
  Schema.Finite,
]).annotate({
  message: "Please provide a string or a number",
})

// Decode with the custom schema, showing the new error message
Schema.decodeUnknownSync(MyUnionWithMessage)(null)
/*
throws:
SchemaError: Please provide a string or a number
*/
```

### General Guidelines for Messages

Attach `message` to the node whose failure you want to replace. For a specific check, pass the annotation to that check constructor; annotating a schema after `.check(...)` targets its last check. If a different inner node fails, its own message or default formatting is used.

### Scalar Schemas

**Example** (Simple Custom Message for Scalar Schema)

```ts twoslash import.meta.vitest name="scalar-schemas-1"
import { Schema } from "effect"

const MyString = Schema.String.annotate({
  message: "my custom message",
})

const decode = Schema.decodeUnknownSync(MyString)

try {
  decode(null)
} catch (e: any) {
  console.log(e.message)
  e.message // => "my custom message"
}
```

### Checks

This example sets a custom message on the last check in a chain. The custom message is used only when `isMaxLength` fails; otherwise, default messages are used.

**Example** (Custom Message on the Last Check)

```ts twoslash import.meta.vitest name="refinements-1"
import { Schema } from "effect"

const MyString = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(2),
).annotate({
  // This message is displayed only if the last filter (`isMaxLength`) fails
  message: "my custom message",
})

const decode = Schema.decodeUnknownSync(MyString)

try {
  decode(null)
} catch (e: any) {
  console.log(e.message)
  e.message // => "Expected string"
}

try {
  decode("")
} catch (e: any) {
  console.log(e.message)
  e.message // => "Expected a value with a length of at least 1"
}

try {
  decode("abc")
} catch (e: any) {
  console.log(e.message)
  e.message // => "my custom message"
}
```

When several checks have custom messages, the first failing check supplies the message:

**Example** (Custom Messages for Multiple Checks)

```ts twoslash import.meta.vitest name="refinements-2"
import { Schema } from "effect"

const MyString = Schema.String
  // This message is displayed only if a non-String is passed as input
  .annotate({ message: "String custom message" })
  .check(
    // This message is displayed only if the filter `isMinLength` fails
    Schema.isMinLength(1, { message: "minLength custom message" }),
    // This message is displayed only if the filter `isMaxLength` fails
    Schema.isMaxLength(2, { message: "maxLength custom message" }),
  )

const decode = Schema.decodeUnknownSync(MyString)

try {
  decode(null)
} catch (e: any) {
  console.log(e.message)
  e.message // => "String custom message"
}

try {
  decode("")
} catch (e: any) {
  console.log(e.message)
  e.message // => "minLength custom message"
}

try {
  decode("abc")
} catch (e: any) {
  console.log(e.message)
  e.message // => "maxLength custom message"
}
```

### Transformations

In this example, `IntFromString` is a transformation schema that converts strings to integers. It applies specific validation messages based on different scenarios.

**Example** (Custom Error Messages for String-to-Integer Transformation)

```ts twoslash import.meta.vitest name="transformations-1"
import { Effect, Schema, SchemaGetter, SchemaIssue } from "effect"

const IntFromString = Schema.String
  // This message is displayed only if the input is not a string
  .annotate({ message: "please enter a string" })
  .pipe(
    Schema.decodeTo(
      // This message is displayed only if the input can be converted
      // to a number but it's not an integer
      Schema.Int.annotate({ message: "please enter an integer" }),
      {
        decode: SchemaGetter.transformOrFail((s) => {
          const n = Number(s)
          return Number.isNaN(n)
            ? Effect.fail(
                // This message is displayed only if the input
                // cannot be converted to a number
                new SchemaIssue.InvalidValue({
                  message: "please enter a parseable string",
                }),
              )
            : Effect.succeed(n)
        }),
        encode: SchemaGetter.transform((n) => String(n)),
      },
    ),
  )

const decode = Schema.decodeUnknownSync(IntFromString)

try {
  decode(null)
} catch (e: any) {
  console.log(e.message)
  e.message // => "please enter a string"
}

try {
  decode("1.2")
} catch (e: any) {
  console.log(e.message)
  e.message // => "please enter an integer"
}

try {
  decode("not a number")
} catch (e: any) {
  console.log(e.message)
  e.message // => "please enter a parseable string"
}
```

### Compound Schemas

The custom message system becomes especially handy when dealing with complex schemas, unlike simple scalar values like `string` or `number`. For instance, consider a schema comprising nested structures, such as a struct containing an array of other structs. Let's explore an example demonstrating the advantage of default messages in handling decoding errors within such nested structures:

**Example** (Custom Error Messages in Nested Schemas)

```ts twoslash
import { Schema } from "effect"

const schema = Schema.Struct({
  outcomes: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      text: Schema.String.annotate({
        message: "error_invalid_outcome_type",
      }).check(
        Schema.isMinLength(1, { message: "error_required_field" }),
        Schema.isMaxLength(50, {
          message: "error_max_length_field",
        }),
      ),
    }),
  ).check(Schema.isMinLength(1, { message: "error_min_length_field" })),
})

Schema.decodeUnknownSync(schema, { errors: "all" })({
  outcomes: [],
})
/*
throws
SchemaError: error_min_length_field
  at ["outcomes"]
*/

Schema.decodeUnknownSync(schema, { errors: "all" })({
  outcomes: [
    { id: "1", text: "" },
    { id: "2", text: "this one is valid" },
    { id: "3", text: "1234567890".repeat(6) },
  ],
})
/*
throws
SchemaError: error_required_field
  at ["outcomes"][0]["text"]
error_max_length_field
  at ["outcomes"][2]["text"]
*/
```

### Missing messages

You can provide custom messages for missing fields or tuple elements using the `messageMissingKey` annotation.

**Example** (Custom Message for Missing Property)

In this example, a custom message is defined for a missing `name` property in the `Person` schema.

```ts twoslash
import { Schema } from "effect"

const Person = Schema.Struct({
  name: Schema.String.pipe(
    // Custom message if "name" is missing
    Schema.annotateKey({ messageMissingKey: "Name is required" }),
  ),
})

Schema.decodeUnknownSync(Person)({})
/*
throws:
SchemaError: Name is required
  at ["name"]
*/
```

**Example** (Custom Message for Missing Tuple Elements)

Here, each element in the `Point` tuple schema has a specific custom message if the element is missing.

```ts twoslash
import { Schema } from "effect"

const Point = Schema.Tuple([
  Schema.Finite.pipe(
    // Message if X is missing
    Schema.annotateKey({ messageMissingKey: "X coordinate is required" }),
  ),
  Schema.Finite.pipe(
    // Message if Y is missing
    Schema.annotateKey({ messageMissingKey: "Y coordinate is required" }),
  ),
])

Schema.decodeUnknownSync(Point)([], { errors: "all" })
/*
throws:
SchemaError: X coordinate is required
  at [0]
Y coordinate is required
  at [1]
*/
```
