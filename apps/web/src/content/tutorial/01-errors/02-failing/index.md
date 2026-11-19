---
title: Return errors in the type
---

TypeScript has no `throws` clause. Thrown errors cannot appear in a function's type. Effect fixes this. `Effect<Success, Error>` records both outcomes:

```ts
//                       ┌─ What it returns on success
//                       │              ┌─ How it can fail
//                       ▼              ▼
const authorizePayment: (
  token: PaymentToken,
) => Effect<Authorization, ExpiredCardError | InvalidTokenError | NetworkError>
```

`Effect.fn` defines a function that returns an `Effect`. It maps to `async` / `await`:

| Operation               | `async` / `await`               | Effect                                 |
| ----------------------- | ------------------------------- | -------------------------------------- |
| Define the function     | `async (token) => { ... }`      | `Effect.fn(function* (token) { ... })` |
| Use a successful result | `await authorizePayment(token)` | `yield* authorizePayment(token)`       |
| Succeed                 | `return authorization`          | `return authorization`                 |
| Fail                    | `throw new ExpiredCardError()`  | `return yield* new ExpiredCardError()` |

A `throw` inside `Effect.fn` is invisible to the type, and it crashes the program instead of failing it. `return yield*` records the error in the type.

`authorizePayment` below still throws. Replace each `throw` with `return yield*`.

```ts
if (token === "tok_expiredcard") {
  return yield * new ExpiredCardError()
}
```

TypeScript now infers the error union from the failing branches.
