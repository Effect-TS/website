---
title: Schema to JSON Schema
description: Export a schema's canonical JSON representation as JSON Schema Draft 2020-12.
sidebar:
  label: JSON Schema
  order: 16
---

`Schema.toJsonSchemaDocument` generates a JSON Schema Draft 2020-12 document for a schema's canonical JSON representation.

Internally, Effect first derives `Schema.toCodecJson(schema)` and then describes that codec's encoded side. The generated JSON Schema therefore matches the values accepted and produced by the canonical JSON codec, including the JSON representations of Effect data types.

## Basic Conversion

**Example** (Generating JSON Schema for a Struct)

```ts twoslash import.meta.vitest name="json-schema-basic-1"
import { Schema } from "effect"

const Person = Schema.Struct({
  name: Schema.String,
  age: Schema.Finite,
})

const document = Schema.toJsonSchemaDocument(Person)

document.dialect // => "draft-2020-12"
document.schema.type // => "object"
document.schema.required // => ["name", "age"]
document.schema.additionalProperties // => false
```

The returned document contains:

- `dialect`: the source dialect, always `"draft-2020-12"`.
- `schema`: the root JSON Schema.
- `definitions`: definitions referenced through `$ref`.

JSON Schema generation is best-effort. Semantics that JSON Schema cannot express exactly may be approximated, and opaque declarations without a structural JSON codec produce an unconstrained schema.

## Canonical JSON Representations

For codecs, the output describes the encoded JSON shape rather than the decoded `Type`.

**Example** (Describing the Encoded Side)

```ts twoslash import.meta.vitest name="json-schema-codec-1"
import { Schema } from "effect"

// Type: number, Encoded: string
Schema.toJsonSchemaDocument(Schema.FiniteFromString).schema // => { type: "string" }
```

Declarations such as `Option`, `Duration`, and `BigInt` define canonical JSON codecs. Their generated JSON Schemas describe those representations.

**Example** (Describing an Option's JSON Representation)

```ts twoslash import.meta.vitest name="json-schema-option-1"
import { Schema } from "effect"

const document = Schema.toJsonSchemaDocument(Schema.Option(Schema.String))

console.log(document.schema)
/*
Output:
{
  anyOf: [
    {
      type: "object",
      properties: {
        _tag: { type: "string", enum: ["Some"] },
        value: { type: "string" }
      },
      required: ["_tag", "value"],
      additionalProperties: false
    },
    {
      type: "object",
      properties: {
        _tag: { type: "string", enum: ["None"] }
      },
      required: ["_tag"],
      additionalProperties: false
    }
  ]
}
*/
```

When defining a custom declaration, provide a `toCodecJson` annotation if it has a meaningful JSON representation. Both `Schema.toCodecJson` and `Schema.toJsonSchemaDocument` will then use the same shape.

## Other Drafts

`Schema.toJsonSchemaDocument` always emits Draft 2020-12. Convert the resulting document with the `JsonSchema` module when another draft is required.

**Example** (Converting to Draft 07)

```ts twoslash import.meta.vitest name="json-schema-draft-07-1"
import { JsonSchema, Schema } from "effect"

const schema = Schema.Tuple([Schema.String, Schema.Finite])

const draft2020_12 = Schema.toJsonSchemaDocument(schema)
const draft07 = JsonSchema.toDocumentDraft07(draft2020_12)

draft07.dialect // => "draft-07"
draft07.schema.items // => [{ type: "string" }, { type: "number" }]
```

`JsonSchema.toDocumentDraft04` similarly converts a document to Draft 04.

## Annotations

The following standard JSON Schema annotations are emitted automatically:

- `title`
- `description`
- `default`
- `examples`
- `readOnly`
- `writeOnly`
- `format`
- `contentEncoding`
- `contentMediaType`
- `contentSchema`

**Example** (Adding Standard Metadata)

```ts twoslash import.meta.vitest name="json-schema-annotations-1"
import { Schema } from "effect"

const Username = Schema.String.annotate({
  title: "Username",
  description: "A user name",
  default: "anonymous",
  examples: ["alice", "bob"],
})

const document = Schema.toJsonSchemaDocument(Username)

document.schema.title // => "Username"
document.schema.description // => "A user name"
document.schema.default // => "anonymous"
document.schema.examples // => ["alice", "bob"]
```

### Annotating a Codec's Encoded Side

Calling `.annotate(...)` on a codec annotates its decoded side. Use `Schema.annotateEncoded` for metadata that belongs to the JSON representation.

**Example** (Annotating Encoded Input)

```ts twoslash import.meta.vitest name="json-schema-annotate-encoded-1"
import { Schema } from "effect"

const schema = Schema.Trim.pipe(
  Schema.annotateEncoded({
    title: "Encoded text",
    description: "Text before trimming",
  }),
)

const document = Schema.toJsonSchemaDocument(schema)

document.schema.type // => "string"
document.schema.title // => "Encoded text"
document.schema.description // => "Text before trimming"
```

### Custom Annotation Keys

Use `includeAnnotationKey` to whitelist non-standard annotations such as editor metadata or vendor extensions. Standard keys are always included.

**Example** (Including Custom Metadata)

```ts twoslash import.meta.vitest name="json-schema-custom-annotations-1"
import { Schema } from "effect"

const schema = Schema.String.annotate({
  description: "A name",
  markdownDescription: "The **name** field",
  "x-widget": "text",
})

const document = Schema.toJsonSchemaDocument(schema, {
  includeAnnotationKey: (key) =>
    key === "markdownDescription" || key.startsWith("x-"),
})

document.schema.description // => "A name"
document.schema.markdownDescription // => "The **name** field"
document.schema["x-widget"] // => "text"
```

## Filters and Constraints

Built-in filters contribute JSON Schema constraints such as `minLength`, `maximum`, `pattern`, and `uniqueItems`.

**Example** (Generating Validation Constraints)

```ts twoslash import.meta.vitest name="json-schema-filters-1"
import { Schema } from "effect"

const Username = Schema.String.check(
  Schema.isMinLength(3),
  Schema.isMaxLength(20),
  Schema.isPattern(/^[a-z0-9_]+$/),
)

Schema.toJsonSchemaDocument(Username).schema.allOf // => [{ minLength: 3 }, { maxLength: 20 }, { pattern: "^[a-z0-9_]+$" }]
```

For a custom filter, provide a `toJsonSchema` callback when its constraint has a JSON Schema equivalent.

**Example** (Describing a Custom Filter)

```ts twoslash import.meta.vitest name="json-schema-custom-filter-1"
import { Schema } from "effect"

const LongString = Schema.String.check(
  Schema.makeFilter((value) => value.length >= 3, {
    expected: "a string with at least three characters",
    toJsonSchema: () => ({ minLength: 3 }),
  }),
)

Schema.toJsonSchemaDocument(LongString).schema.allOf // => [{ minLength: 3 }]
```

Set `generateDescriptions: true` to turn a check's `expected` annotation into a description when no description was supplied explicitly.

## Optional Properties

An `optionalKey` property is omitted from `required`. A property defined with `optional` is also omitted from `required`, and its explicit `undefined` case is represented as `null` because JSON has no `undefined` value.

**Example** (Optional Properties)

```ts twoslash import.meta.vitest name="json-schema-optional-properties-1"
import { Schema } from "effect"

const schema = Schema.Struct({
  name: Schema.optionalKey(Schema.String),
  nickname: Schema.optional(Schema.String),
})

const document = Schema.toJsonSchemaDocument(schema)

console.log(document.schema)
/*
Output:
{
  type: "object",
  properties: {
    name: { type: "string" },
    nickname: {
      anyOf: [{ type: "string" }, { type: "null" }]
    }
  },
  additionalProperties: false
}
*/
```

## References and Recursion

An `identifier` annotation creates a definition and replaces uses of that schema with `$ref`.

**Example** (Creating Reusable Definitions)

```ts twoslash import.meta.vitest name="json-schema-identifiers-1"
import { Schema } from "effect"

const Name = Schema.String.annotate({ identifier: "Name" })
const Person = Schema.Struct({ name: Name })

const document = Schema.toJsonSchemaDocument(Person)

console.log(document.schema)
/*
Output:
{
  type: "object",
  properties: {
    name: { $ref: "#/$defs/Name" }
  },
  required: ["name"],
  additionalProperties: false
}
*/
```

Recursive schemas require an identifier so their self-references can be emitted as `$ref`.

**Example** (Generating a Recursive JSON Schema)

```ts twoslash import.meta.vitest name="json-schema-recursion-1"
import { Schema } from "effect"

interface Category {
  readonly name: string
  readonly categories: ReadonlyArray<Category>
}

const Category = Schema.Struct({
  name: Schema.String,
  categories: Schema.Array(
    Schema.suspend((): Schema.Codec<Category> => Category),
  ),
}).annotate({ identifier: "Category" })

const document = Schema.toJsonSchemaDocument(Category)

console.log(document)
/*
Output:
{
  dialect: "draft-2020-12",
  schema: {
    $ref: "#/$defs/Category"
  },
  definitions: {
    Category: {
      type: "object",
      properties: {
        name: { type: "string" },
        categories: {
          type: "array",
          items: { $ref: "#/$defs/Category" }
        }
      },
      required: ["name", "categories"],
      additionalProperties: false
    }
  }
}
*/
```

## Generation Options

`Schema.toJsonSchemaDocument` accepts three options:

- `additionalProperties`: `false` by default, `true` to allow extra properties, or a JSON Schema describing them.
- `generateDescriptions`: generate missing check descriptions from `expected` annotations.
- `includeAnnotationKey`: include selected non-standard annotation keys.

**Example** (Allowing Additional Properties)

```ts twoslash import.meta.vitest name="json-schema-additional-properties-1"
import { Schema } from "effect"

const schema = Schema.Struct({ name: Schema.String })

const document = Schema.toJsonSchemaDocument(schema, {
  additionalProperties: true,
})

document.schema.additionalProperties // => true
```

## JSON Strings

`Schema.fromJsonString` accepts a JSON string and decodes its parsed contents with another schema. Its JSON Schema describes the outer string and marks its media type as JSON.

**Example** (Describing a JSON String)

```ts twoslash import.meta.vitest name="json-schema-from-json-string-1"
import { Schema } from "effect"

const schema = Schema.fromJsonString(Schema.Struct({ name: Schema.String }))

const document = Schema.toJsonSchemaDocument(schema)

document.schema.type // => "string"
document.schema.contentMediaType // => "application/json"
```
