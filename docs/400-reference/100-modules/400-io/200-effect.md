---
title: Effect
---

`effect` is a library for asynchronous and concurrent programming in TypeScript which is based on the principles of pure functional programming.

## Effect

At the core of `effect` is the `Effect` type, a powerful data type which allows you to solve complex problems with simple, type-safe, testable, and composable code.

Let's take a look at the type definition:

```typescript
type Effect<R, E, A> = omitted.
```

We omit the actual definition of `Effect` because it is not necessary to understand to be able to use `effect`.

Instead, we can conceptualize the definition of the `Effect` type as:

```typescript
type Effect<R, E, A> = (r: R) => Promise<Either<E, A>>
```

Using the logical definition above, an `Effect` can be thought of as a program that requires some input `R` and either fails with an error of type `E` or succeeds with a value of type `A`.

## Type Parameters

As we have observed above, the `Effect<R, E, A>` type has three type parameters:

**`R` - The Environment Type**

An `Effect` may require an environment of type `R`. If the `R` parameter is `unknown`, it indicates that the `Effect` does not require any environment to be executed.

Of note, the letter `R` is used to denote a *requirement* for the `Effect` to be executed.

**`E` - The Failure Type**

An `Effect` may fail with a value of type `E`. If this parameter is `never`, it indicates that the effect cannot fail.

Of note, the letter `E` is used to denote a possible *error* which the `Effect` can fail with.

**`A` - The Success Type**

An `Effect` may succeed with a value of type `A`. If this type parameter is `void`, it indicates that the effect produces no useful information. If this type parameter is `never`, it indicates that the effect will run forever (or until failure).

## Type Aliases

The `Effect` data type is the only effect type in `effect`. However, there are several type aliases related to `Effect` which can simplify type signatures:

| Type Alias  | Concrete Type               | Description                                                                                     |
|:-----------:|:---------------------------:|:-----------------------------------------------------------------------------------------------:|
| `UIO<A>`    | `Effect<unknown, never, A>` | Represents an effect that has no requirements, and cannot fail, but can succeed with an `A`     |
| `RIO<R, A>` | `Effect<R, never, A>`       | Represents an effect that requires an `R`, and cannot fail, but can succeed with an `A`         |
| `IO<E, A>`  | `Effect<unknown, E, A>`     | Represents an effect that has no requirements, and may fail with an `E`, or succeed with an `A` |
