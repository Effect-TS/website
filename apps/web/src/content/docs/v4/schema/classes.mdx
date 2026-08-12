---
title: Class APIs
description: Define and extend schema-backed classes with validated constructors, methods, equality, and recursive fields.
sidebar:
  order: 11
---

import { Aside } from "@astrojs/starlight/components"

When working with schemas, you can use `Schema.Class` instead of a plain [Schema.Struct](/docs/v4/schema/basic-usage/#structs) when your domain model benefits from class instances.

Classes offer several features that simplify the schema creation process:

- **Schema and class in one definition**: The class itself can be used anywhere a schema is expected.
- **Validated construction**: The constructor and `make` check their input.
- **Shared behavior**: Instances can expose methods and getters.
- **Structural equality**: Instances can be compared with [`Equal.equals`](/docs/v4/trait/equal/).

<Aside type="caution" title="Class Schemas Are Transformations">
  Classes defined with `Schema.Class` act as
  [transformations](/docs/v4/schema/transformations/). See [Class Schemas are
  Transformations](#class-schemas-are-transformations) for details.
</Aside>

## Definition

To define a class using `Schema.Class`, you need to specify:

- The class type as the `Self` type parameter.
- A stable identifier used in diagnostics and schema metadata.
- The fields of the class.

**Example** (Defining a Schema Class)

```ts twoslash
import { Schema } from "effect"

class Person extends Schema.Class<Person>("Person")({
  id: Schema.Finite,
  name: Schema.NonEmptyString,
}) {}
```

In this example, `Person` is both a schema and a TypeScript class.

**Example** (Creating Instances)

```ts twoslash import.meta.vitest name="definition-1"
import { Schema } from "effect"

class Person extends Schema.Class<Person>("Person")({
  id: Schema.Finite,
  name: Schema.NonEmptyString,
}) {}

console.log(new Person({ id: 1, name: "John" }))
/*
Output:
Person { id: 1, name: 'John' }
*/

// Using the factory function
console.log(Person.make({ id: 1, name: "John" }))
/*
Output:
Person { id: 1, name: 'John' }
*/
```

<Aside type="note" title="Why Use Identifiers?">
  The identifier is exposed as `Person.identifier`, stored in the schema AST, and used in diagnostics and generated references. It also provides a runtime marker that lets Effect recognize instances across hot module reloads, where `instanceof` alone can fail after the constructor is replaced.

</Aside>

### Class Schemas are Transformations

Class schemas [transform](/docs/v4/schema/transformations/) a struct schema into a [declaration](/docs/v4/schema/advanced-usage/#declaring-new-data-types) schema that represents the class.

- When decoding, a plain object is converted into an instance of the class.
- When encoding, a class instance is converted back into a plain object.

**Example** (Decoding and Encoding a Class)

```ts twoslash import.meta.vitest name="class-schemas-are-transformations-1"
import { Schema } from "effect"

class Person extends Schema.Class<Person>("Person")({
  id: Schema.Finite,
  name: Schema.NonEmptyString,
}) {}

const person = Person.make({ id: 1, name: "John" })

// Decode from a plain object into a class instance
const decoded = Schema.decodeUnknownSync(Person)({ id: 1, name: "John" })
console.log(decoded)
// Output: Person { id: 1, name: 'John' }

// Encode a class instance back into a plain object
const encoded = Schema.encodeUnknownSync(Person)(person)
console.log(encoded)
// Output: { id: 1, name: 'John' }
```

### Defining Classes Without Fields

When your schema does not require any fields, you can define a class with an empty object.

**Example** (Defining and Using a Class Without Arguments)

```ts twoslash import.meta.vitest name="defining-classes-without-fields-1"
import { Schema } from "effect"

// Define a class with no fields
class NoArgs extends Schema.Class<NoArgs>("NoArgs")({}) {}

// Create an instance using the default constructor
const noargs1 = new NoArgs() // => new NoArgs({})

// Alternatively, create an instance by explicitly passing an empty object
const noargs2 = new NoArgs({}) // => new NoArgs()
```

### Defining Classes With Filters

Filters allow you to validate input when decoding, encoding, or creating an instance. Instead of specifying raw fields, you can pass a `Schema.Struct` with a filter applied.

**Example** (Applying a Filter to a Schema Class)

```ts twoslash
import { Schema } from "effect"

class WithFilter extends Schema.Class<WithFilter>("WithFilter")(
  Schema.Struct({
    a: Schema.FiniteFromString,
    b: Schema.FiniteFromString,
  }).check(
    Schema.makeFilter(
      ({ a, b }) => a >= b || "a must be greater than or equal to b",
    ),
  ),
) {}

// Constructor
console.log(new WithFilter({ a: 1, b: 2 }))
/*
throws:
a must be greater than or equal to b
*/

// Decoding
console.log(Schema.decodeUnknownSync(WithFilter)({ a: "1", b: "2" }))
/*
throws:
a must be greater than or equal to b
*/
```

## Validating Properties via Class Constructors

When you define a class using `Schema.Class`, the constructor automatically checks that the provided properties adhere to the schema's rules.

### Defining and Instantiating a Valid Class Instance

The constructor ensures that each property, like `id` and `name`, adheres to the schema. For instance, `id` must be a number, and `name` must be a non-empty string.

**Example** (Creating a Valid Instance)

```ts twoslash import.meta.vitest name="defining-and-instantiating-a-valid-class-instance-1"
import { Schema } from "effect"

class Person extends Schema.Class<Person>("Person")({
  id: Schema.Finite,
  name: Schema.NonEmptyString,
}) {}

// Create an instance with valid properties
const john = new Person({ id: 1, name: "John" }) // => new Person({ id: 1, name: "John" })
```

### Handling Invalid Properties

If invalid properties are provided during instantiation, the constructor throws an error, explaining why the validation failed.

**Example** (Creating an Instance with Invalid Properties)

```ts twoslash
import { Schema } from "effect"

class Person extends Schema.Class<Person>("Person")({
  id: Schema.Finite,
  name: Schema.NonEmptyString,
}) {}

// Attempt to create an instance with an invalid `name`
new Person({ id: 1, name: "" })
/*
throws:
Expected a value with a length of at least 1
  at ["name"]
*/
```

The error clearly specifies that the `name` field failed to meet the `NonEmptyString` requirement.

### Bypassing Checks

In some scenarios, you might want to bypass the validation logic. While not generally recommended, the library provides an option to do so.

**Example** (Bypassing Checks)

```ts twoslash
import { Schema } from "effect"

class Person extends Schema.Class<Person>("Person")({
  id: Schema.Finite,
  name: Schema.NonEmptyString,
}) {}

// Skip the schema checks during instantiation
const john = new Person({ id: 1, name: "" }, { disableChecks: true })
```

## Structural Equality

[`Equal.equals`](/docs/v4/trait/equal/) compares class instances structurally, including nested objects and arrays.

**Example** (Comparing Instances by Value)

```ts twoslash import.meta.vitest name="class-structural-equality-1"
import { Equal, Schema } from "effect"

class Person extends Schema.Class<Person>("Person")({
  name: Schema.NonEmptyString,
  hobbies: Schema.Array(Schema.String),
}) {}

const john1 = new Person({
  name: "John",
  hobbies: ["reading", "coding"],
})
const john2 = new Person({
  name: "John",
  hobbies: ["reading", "coding"],
})

Equal.equals(john1, john2) // => true
```

## Extending Classes with Custom Logic

Schema classes provide the flexibility to include custom getters and methods, allowing you to extend their functionality beyond the defined fields.

### Adding Custom Getters

A getter can be used to derive computed values from the fields of the class. For example, a `Person` class can include a getter to return the `name` property in uppercase.

**Example** (Adding a Getter for Uppercase Name)

```ts twoslash import.meta.vitest name="adding-custom-getters-1"
import { Schema } from "effect"

class Person extends Schema.Class<Person>("Person")({
  id: Schema.Finite,
  name: Schema.NonEmptyString,
}) {
  // Custom getter to return the name in uppercase
  get upperName() {
    return this.name.toUpperCase()
  }
}

const john = new Person({ id: 1, name: "John" })

// Use the custom getter
console.log(john.upperName)
// Output: "JOHN"
```

### Adding Custom Methods

In addition to getters, you can define methods to encapsulate more complex logic or operations involving the class's fields.

**Example** (Adding a Method)

```ts twoslash import.meta.vitest name="adding-custom-methods-1"
import { Schema } from "effect"

class Person extends Schema.Class<Person>("Person")({
  id: Schema.Finite,
  name: Schema.NonEmptyString,
}) {
  // Custom method to return a greeting
  greet() {
    return `Hello, my name is ${this.name}.`
  }
}

const john = new Person({ id: 1, name: "John" })

// Use the custom method
console.log(john.greet())
// Output: "Hello, my name is John."
```

## Leveraging Classes as Schema Definitions

When you define a class with `Schema.Class`, it serves both as a schema and as a class. This dual functionality allows the class to be used wherever a schema is required.

**Example** (Using a Class in an Array Schema)

```ts twoslash
import { Schema } from "effect"

class Person extends Schema.Class<Person>("Person")({
  id: Schema.Finite,
  name: Schema.NonEmptyString,
}) {}

// Use the Person class in an array schema
const Persons = Schema.Array(Person)

//     ┌─── readonly Person[]
//     ▼
type Type = typeof Persons.Type
```

### Exposed Values

The class also includes a `fields` static property, which outlines the fields defined during the class creation.

**Example** (Accessing the `fields` Property)

```ts twoslash
import { Schema } from "effect"

class Person extends Schema.Class<Person>("Person")({
  id: Schema.Finite,
  name: Schema.NonEmptyString,
}) {}

//       ┌─── {
//       |      readonly id: Schema.Finite;
//       |      readonly name: Schema.NonEmptyString;
//       |    }
//       ▼
Person.fields
```

## Adding Annotations

Pass annotations as the second argument after the fields or struct. The identifier passed to `Schema.Class` is also stored as the default `identifier` annotation.

**Example** (Annotating a Class Schema)

```ts twoslash
import { Schema } from "effect"

class Person extends Schema.Class<Person>("Person")(
  {
    id: Schema.Finite,
    name: Schema.NonEmptyString,
  },
  { title: "Person model" },
) {}

Person.identifier // => "Person"
Person.ast.annotations?.title // => "Person model"
```

## Recursive Schemas

The `Schema.suspend` combinator is useful when you need to define a schema that depends on itself, like in the case of recursive data structures.
In this example, the `Category` schema depends on itself because it has a field `subcategories` that is an array of `Category` objects.

**Example** (Self-Referencing Schema)

```ts twoslash
import { Schema } from "effect"

// Define a Category schema with a recursive subcategories field
class Category extends Schema.Class<Category>("Category")({
  name: Schema.String,
  subcategories: Schema.Array(
    Schema.suspend((): Schema.Codec<Category> => Category),
  ),
}) {}
```

<Aside type="note" title="Correct Inference">
  It is necessary to add an explicit type annotation because otherwise
  TypeScript would struggle to infer types correctly. Without this annotation,
  you might encounter this error message:
</Aside>

**Example** (Missing Type Annotation Error)

```ts twoslash
import { Schema } from "effect"

// @errors: 2506 7024
class Category extends Schema.Class<Category>("Category")({
  name: Schema.String,
  subcategories: Schema.Array(Schema.suspend(() => Category)),
}) {}
```

### Mutually Recursive Schemas

Sometimes, schemas depend on each other in a mutually recursive way. For instance, an arithmetic expression tree might include `Expression` nodes that can either be numbers or `Operation` nodes, which in turn reference `Expression` nodes.

**Example** (Arithmetic Expression Tree)

```ts twoslash
import { Schema } from "effect"

class Expression extends Schema.Class<Expression>("Expression")({
  type: Schema.Literal("expression"),
  value: Schema.Union([
    Schema.Finite,
    Schema.suspend((): Schema.Codec<Operation> => Operation),
  ]),
}) {}

class Operation extends Schema.Class<Operation>("Operation")({
  type: Schema.Literal("operation"),
  operator: Schema.Literals(["+", "-"]),
  left: Expression,
  right: Expression,
}) {}
```

### Recursive Types with Different Encoded and Type

Defining recursive schemas where the `Encoded` type differs from the `Type` type requires an explicit encoded representation. For instance, `FiniteFromString` has `number` as its `Type` and `string` as its `Encoded`.

In such cases, we need to define an interface for the `Encoded` type.

Let's add an `id` field to the `Category` schema using `FiniteFromString`.
When we add this field to the `Category` schema, TypeScript raises an error:

```ts twoslash
import { Schema } from "effect"

class Category extends Schema.Class<Category>("Category")({
  id: Schema.FiniteFromString,
  name: Schema.String,
  subcategories: Schema.Array(
    // @errors: 2322
    Schema.suspend((): Schema.Codec<Category> => Category),
  ),
}) {}
```

The `Schema.Codec<Category>` annotation assumes that both the `Type` and `Encoded` are `Category`. Supply the recursive encoded type as the second parameter instead:

**Example** (Adjusting the Schema with Explicit `Encoded` Type)

```ts twoslash
import { Schema } from "effect"

interface CategoryEncoded {
  readonly id: string
  readonly name: string
  readonly subcategories: ReadonlyArray<CategoryEncoded>
}

class Category extends Schema.Class<Category>("Category")({
  id: Schema.FiniteFromString,
  name: Schema.String,
  subcategories: Schema.Array(
    Schema.suspend((): Schema.Codec<Category, CategoryEncoded> => Category),
  ),
}) {}
```

As we've observed, it's necessary to define an interface for the `Encoded` of the schema to enable recursive schema definition, which can complicate things and be quite tedious.
One pattern to mitigate this is to **separate the field responsible for recursion** from all other fields.

**Example** (Separating Recursive Field)

```ts twoslash
import { Schema } from "effect"

const fields = {
  id: Schema.FiniteFromString,
  name: Schema.String,
  // ...possibly other fields
}

interface CategoryEncoded extends Schema.Struct.Encoded<typeof fields> {
  // Define `subcategories` using recursion
  readonly subcategories: ReadonlyArray<CategoryEncoded>
}

class Category extends Schema.Class<Category>("Category")({
  ...fields, // Include the fields
  subcategories: Schema.Array(
    // Define `subcategories` using recursion
    Schema.suspend((): Schema.Codec<Category, CategoryEncoded> => Category),
  ),
}) {}
```

## Tagged Class Variants

`Schema.TaggedClass` automatically adds a `_tag` field, while `Schema.TaggedError` also creates a yieldable `Error`. Both use the tag as their identifier by default.

**Example** (Creating Tagged Classes and Errors)

```ts twoslash import.meta.vitest name="tagged-class-variants-1"
import { Schema } from "effect"

// Define a tagged class with a "name" field
class TaggedPerson extends Schema.TaggedClass<TaggedPerson>()("TaggedPerson", {
  name: Schema.String,
}) {}

// Define a tagged error with a "status" field
class HttpError extends Schema.TaggedError<HttpError>()("HttpError", {
  status: Schema.Finite,
}) {}

const joe = new TaggedPerson({ name: "Joe" })
console.log(joe._tag)
// Output: "TaggedPerson"

const error = new HttpError({ status: 404 })
console.log(error._tag)
// Output: "HttpError"

console.log(error.stack) // access the stack trace
```

## Extending Existing Classes

The `extend` static utility allows you to enhance an existing schema class by adding **additional** fields and functionality. This approach helps in building on top of existing schemas without redefining them from scratch.

**Example** (Extending a Schema Class)

```ts twoslash import.meta.vitest name="extending-existing-classes-1"
import { Schema } from "effect"

// Define the base class
class Person extends Schema.Class<Person>("Person")({
  id: Schema.Finite,
  name: Schema.NonEmptyString,
}) {
  // A custom getter that converts the name to uppercase
  get upperName() {
    return this.name.toUpperCase()
  }
}

// Extend the base class to include an "age" field
class PersonWithAge extends Person.extend<PersonWithAge>("PersonWithAge")({
  age: Schema.Finite,
}) {
  // A custom getter to check if the person is an adult
  get isAdult() {
    return this.age >= 18
  }
}

// Usage
const john = new PersonWithAge({ id: 1, name: "John", age: 25 })
console.log(john.upperName) // Output: "JOHN"
console.log(john.isAdult) // Output: true
```
