---
title: The Effect Type
---

The `Effect` data type  was designed from the ground up to be a completely type-safe representation of any program.

Conceptually, we can begin to build a mental model of the `Effect` data type by thinking of it as a function that takes some `Context` as input, and when executed can either fail with some `Error` or succeed with some `Value`.

```ts
declare const Effect: (context: Context) => Either<Error, Value>
```

<Callout>
**Note**: this mental model should be used for _conceptual_ purposes only - the `Effect` type is much more powerful than just a function.
</Callout>


The `Effect` type is parameterized by three generic type parameters:

`Effect<Context, Failure, Success>`

which have the following meaning:

- `Context`: Represents the contextual data which is required by the `Effect` in order to be executed

- `Failure`: Represents _expected_ failures that can occur when an `Effect` is executed

- `Success`: Represents the type of the value that an `Effect` can succeed with when executed

<Callout>
Throughout the Effect ecosystem, you will often see `Effect`'s type parameters abbreviated as `R`, `E`, and `A` respectively. This is just shorthand for `R`equirements, `E`rror, and the success value of type `A`.
</Callout>

You can think of each of these type parameters as separate "channels" within the `Effect` data type. Your program can interact with each of these "channels" during its execution.



