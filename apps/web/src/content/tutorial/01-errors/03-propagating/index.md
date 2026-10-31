---
title: Propagate errors
---

`processPayment` calls `authorizePayment` and turns the result into an HTTP response.

With `async` / `await` you wrap the call in `try` / `catch`. TypeScript cannot check what you catch, so you must rethrow what you do not know:

```ts
try {
  const authorization = await authorizePayment(token)
  return Response.json(authorization)
} catch (error) {
  // `error` is `unknown`
  if (error instanceof ExpiredCardError) {
    return new Response("Card expired", { status: 402 })
  }
  throw error
}
```

With Effect, the body describes only the successful path. If `authorizePayment` succeeds, `yield*` returns the `Authorization`. If it fails, Effect stops the function and passes the error to the caller. No `try` / `catch` is needed:

```ts
const processPayment = Effect.fn(function* (token: PaymentToken) {
  const authorization = yield* authorizePayment(token)
  return Response.json(authorization)
})
```

The success type changes to `Response`. The error union propagates unchanged:

```ts
const processPayment: (
  token: PaymentToken,
) => Effect<Response, ExpiredCardError | InvalidTokenError | NetworkError>
```

`processPayment` below returns a fixed response. Call `authorizePayment` with `yield*`, then return its result as JSON.
