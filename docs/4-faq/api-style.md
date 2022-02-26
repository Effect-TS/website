# FAQ: API Style

Effect-TS exposes for almost every module 3 types of APIs, namely:

1) A pipeable api, to be used like:

```ts
pipe(IO.succeed(0), IO.map((n) => n + 1))
```

2) A data-first api, to be used like:

```ts
IO.map_(IO.succeed(0), (n) => n + 1)
```

3) A generator-based api to be used like:

```ts
IO.gen(function* (_) {
  const x = yield* _(IO.succeed(0))
  const y = yield* _(IO.succeed(1))
  return x + y
})
```

Why is it so?

1) The pipeable API is the most flexible and common in usage, it is easy to extend and usually "nice to use"

2) The data-first API is there mostly for performance optimisation, the effect compiler plugin removes `pipe` and when possible converts pipeable calls like `T.map(f)(a)` into `T.map_(a, f)`. Sometimes using `pipe` for single function procedures feels unnecessary and cumbersome, for those cases direct usage of the data-first variants can feel more natural.

3) The generator-based API is very flexible and extremely useful but less performant compared to the others and especially slow in multi-shot effects like Stream/Chunk/Array, generators are not immutable in JS and in case of multi-shot effects it is necessary to replay the generator's iterator multiple times, the workaround is to keep the stack in memory and always recompute everything in the body of the generator except the yields.

Guidance:

Use generator based APIs for service construction and things that execute at bootstrap time and pipeable/data-first for implementations, the generator api supports direct yielding of things like `Tag` that make access to services easy for example:

```ts
import * as T from "@effect-ts/core/Effect"

const UserRepoId = Symbol()

const makeUserRepo = T.gen(function* (_) {
  const database = yield* _(Database)

  const getUserById = (id: UserId) => database.query(`SELECT * FROM users WHERE id = ${id}`)

  const getAllUsers = database.query(`SELECT * FROM users`)

  const countUsers = T.map_(getAllUsers, (users) => users.length)

  const login = (id: UserId, password: Password) => pipe(
    T.do,
    T.bind("user", () => getUserById(id)),
    T.bind("validation", ({user}) => validateUserPassword(user.password, password)),
    T.map(({user}) => user)
  )

  return service(UserRepoId, {
    getUserById,
    getAllUsers,
    countUsers,
    login
  })
})
```
