---
title: Schema to Formatter
description: Generate formatted string representations of values based on schemas.
sidebar:
  label: Formatter
  order: 18
---

`Schema.toFormatter` derives a human-readable formatter for values of a schema's `Type`. It recursively formats structs, arrays, unions, and declarations; it does not validate the value.

This value formatter is distinct from the [Error Formatters](/docs/v4/schema/error-formatters/) used for decoding and encoding failures.

**Example** (Formatter for a Struct Schema)

```ts twoslash import.meta.vitest name="schema-to-formatter-1"
import { Schema } from "effect"

const Person = Schema.Struct({
  name: Schema.String,
  age: Schema.Finite,
})

const PersonFormatter = Schema.toFormatter(Person)

PersonFormatter({ name: "Alice", age: 30 }) // => `{ "name": "Alice", "age": 30 }`
```

## Customizing Formatter Generation

Use `Schema.overrideToFormatter` to replace the formatter derived for an existing schema.

**Example** (Custom Formatter for Numbers)

```ts twoslash import.meta.vitest name="customizing-formatter-generation-1"
import { Schema } from "effect"

const schema = Schema.Finite.pipe(
  Schema.overrideToFormatter(() => (value) => `my format: ${value}`),
)

const customFormatter = Schema.toFormatter(schema)

customFormatter(1) // => "my format: 1"
```

Declarations can instead provide a `toFormatter` annotation when they are defined. Parameterized declarations receive the formatter derived for each type parameter.

## Intercepting AST Nodes

Pass an `onBefore` hook to intercept selected AST nodes before the default formatter is derived. Return `undefined` to retain the default behavior.

**Example** (Customizing All String Nodes)

```ts twoslash import.meta.vitest name="formatter-on-before-1"
import { Schema } from "effect"

const Person = Schema.Struct({
  name: Schema.String,
  city: Schema.String,
})

const formatter = Schema.toFormatter(Person, {
  onBefore: (ast) =>
    ast._tag === "String" ? (value: string) => `<${value}>` : undefined,
})

formatter({ name: "Alice", city: "Rome" }) // => `{ "name": <Alice>, "city": <Rome> }`
```
