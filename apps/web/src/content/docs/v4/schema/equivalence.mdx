---
title: Schema to Equivalence
description: Derive and customize equivalence checks from schema structure.
sidebar:
  label: Equivalence
  order: 17
---

`Schema.toEquivalence` derives an [Equivalence](/docs/v4/behaviour/equivalence/) for a schema's `Type`. Nested values are compared according to the corresponding nested schemas.

**Example** (Comparing Structs)

```ts twoslash import.meta.vitest name="schema-to-equivalence-1"
import { Schema } from "effect"

const Person = Schema.Struct({
  name: Schema.String,
  age: Schema.Finite,
  tags: Schema.Array(Schema.String),
})

const equivalence = Schema.toEquivalence(Person)

equivalence(
  { name: "John", age: 23, tags: ["admin"] },
  { name: "John", age: 23, tags: ["admin"] },
) // => true

equivalence(
  { name: "John", age: 23, tags: ["admin"] },
  { name: "John", age: 24, tags: ["admin"] },
) // => false
```

For a struct, only fields described by the schema participate in the derived equivalence. Arrays and nested structs are compared recursively.

## Broad Schemas

`Schema.Any`, `Schema.Unknown`, `Schema.ObjectKeyword`, and an empty `Schema.Struct({})` use `Equal.equals`. `Equal.equals` performs deep structural comparison for objects and arrays rather than defaulting to reference equality.

**Example** (Structural Equality for an Empty Struct)

```ts twoslash import.meta.vitest name="equivalence-empty-struct-1"
import { Schema } from "effect"

const equivalence = Schema.toEquivalence(Schema.Struct({}))

equivalence({ nested: [1, 2] }, { nested: [1, 2] }) // => true
```

## Declarations

Declarations are opaque to automatic derivation. Provide a `toEquivalence` annotation when the declaration needs behavior other than `Equal.equals`.

**Example** (Defining Equivalence for a Class)

```ts twoslash import.meta.vitest name="equivalence-declaration-1"
import { Schema } from "effect"

class User {
  constructor(
    readonly id: number,
    readonly displayName: string,
  ) {}
}

const UserSchema = Schema.instanceOf(User, {
  toEquivalence: () => (self, that) => self.id === that.id,
})

const equivalence = Schema.toEquivalence(UserSchema)

equivalence(new User(1, "Alice"), new User(1, "Alicia")) // => true
```

Parameterized declarations receive the derived equivalence for each type parameter in the annotation callback.

## Overrides

Use `Schema.overrideToEquivalence` to replace the equivalence derived for an existing schema.

**Example** (Comparing a Struct by One Field)

```ts twoslash import.meta.vitest name="customizing-equivalence-generation-1"
import { Schema } from "effect"

const User = Schema.Struct({
  id: Schema.Finite,
  displayName: Schema.String,
}).pipe(Schema.overrideToEquivalence(() => (self, that) => self.id === that.id))

const equivalence = Schema.toEquivalence(User)

equivalence({ id: 1, displayName: "Alice" }, { id: 1, displayName: "Alicia" }) // => true

equivalence({ id: 1, displayName: "Alice" }, { id: 2, displayName: "Alice" }) // => false
```
