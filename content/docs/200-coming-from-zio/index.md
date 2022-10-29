---
title: Coming from ZIO?
---

If you are coming to Effect from ZIO, there are a few differences to be aware of.
<br/>

## Representing the Environment (`R`)

In Effect, we represent the environment required to run an `Effect` workflow as a union of services:

```ts twoslash
import type { Effect } from "@effect/core/io/Effect"

//                    v--------v---- `R` is a union of Console | Logger
type Http = Effect<Console | Logger, IOError | HttpError, Response>

type Response = Record<string, string>

interface IOError {
  readonly _tag: "IOError"
}

interface HttpError {
  readonly _tag: "HttpError"
}

interface Console {
  readonly log: (msg: string) => void
}

interface Logger {
  readonly log: (msg: string) => void
}
```

This may be confusing to folks coming from ZIO, where the environment is represented as an intersection of services:

```scala
type Http = ZIO[Console with Logger, IOError with HttpError, Response]
```

### Rationale

<br />
The rationale for using a union to represent the environment required by an `Effect` workflow boils down to our desire to remove `Has` as a wrapper for services in the environment (similar to what was achieved in ZIO 2.0).
<br />
To be able to remove `Has` from Effect, we had to think a bit more structurally given that TypeScript is a structural type system. In TypeScript, if you have a type `A & B` where there is a structural conflict between `A` and `B`, the type `A & B` will reduce to `never`.

```ts twoslash
// @errors: 2322
interface A {
  readonly prop: string
}

interface B {
  readonly prop: number
}

const ab: A & B = {
  prop: ""
}
```

In previous versions of Effect, intersections were used for representing an environment with multiple services. The problem with using intersections (i.e. `A & B`) is that there could be multiple services in the environment with that have functions and properties named in the same way. To remedy this, we wrapped services in the `Has` type (similar to ZIO 1.0), so you would have `Has<A> & Has<B>` in your environment.
<br />
In ZIO 2.0, the _contravariant_ `R` type parameter of the `ZIO` type (representing the environment) became fully phantom, thus allowing for removal of the `Has` type. This significantly improved the clarity of type signatures as well as removing another "stumbling block" for new users.
<br />
To faciliate removal of `Has` in Effect, we had to consider how types in the environment compose. By the rule of composition, contravariant parameters composed as an intersection (i.e. with `&`) are equivalent to covariant parameters composed together as a union (i.e. with `|`) for purposes of assignability. Based upon this fact, we decided to diverge from ZIO and make the `R` type parameter _covariant_ given `A | B` does not reduce to `never` if `A` and `B` have conflicts.
<br />
From our example above:

```ts twoslash
interface A {
  readonly prop: string
}

interface B {
  readonly prop: number
}

const ab: A | B = {
  prop: ""
}
```

Representing `R` as a covariant type parameter containing the union of services required by an `Effect` workflow allowed us to remove the requirement for `Has`.
