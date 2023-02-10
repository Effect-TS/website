---
title: The Effect Type
---

Effect was designed from the ground up to be a completely type-safe representation of any program.

To achieve this, the `Effect` type is parameterized by three generic type parameters:

`Effect<Context, Failure, Success>`

which have the following meaning:

- `Context`: Represents the contextual data which is required by the `Effect` in order to be executed

- `Failure`: Represents _expected_ failures that can occur when an `Effect` is executed

- `Success`: Represents the type of the value that an `Effect` can succeed with when executed

<Callout>
Throughout the Effect ecosystem, you will often see `Effect`'s type parameters abbreviated as `R`, `E`, and `A` respectively. This is just shorthand for `R`equirements, `E`rror, and the success value of type `A`.
</Callout>





