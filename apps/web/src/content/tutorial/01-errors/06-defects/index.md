---
title: Stop on a defect
---

The `Error` type holds **expected errors**: problems a caller can recover from. Some problems do not belong there. A broken rule or an impossible state must stop the computation. No handler can make it safe to continue.

Effect calls such a problem an **unexpected error**, or a **defect**. Defects do not appear in the `Error` type. At runtime, Effect stores why a computation stopped in a value called a `Cause`.

This is why an `Effect<Success, never>` can still stop. `never` means no expected errors. It does not mean nothing can go wrong.

Example: capturing an authorization completes the charge. Each authorization may be captured only once. A second capture can charge the customer twice. No caller can fix that, so the computation must stop.

`Effect.die` stops a computation with a defect:

```ts
const capturePayment = Effect.fn(function* (authorization: Authorization) {
  if (captured.has(authorization.id)) {
    return yield* Effect.die(new DoubleCaptureError({ id: authorization.id }))
  }

  captured.add(authorization.id)
  return authorization
})
```

The type does not change. `DoubleCaptureError` is a defect, so it does not enter the error union:

```ts
const capturePayment: (
  authorization: Authorization,
) => Effect<Authorization, never>
```

`processPayment` can now call `capturePayment` after `authorizePayment`. It keeps only the three expected errors:

```ts
const processPayment = Effect.fn(function* (token: PaymentToken) {
  const authorization = yield* authorizePayment(token)

  if (authorization.status === "authorized") {
    yield* capturePayment(authorization)
  }

  return Response.json(authorization)
})
```

Effect records defects in the `Cause`, not in the `Error` type.

`capturePayment` below records each capture but never checks for a repeat. Stop with `Effect.die` when the authorization is already captured.
