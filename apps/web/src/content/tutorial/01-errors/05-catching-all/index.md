---
title: Handle every error
---

`Effect.catchTags` handles several errors with one object. Each key is an error's `_tag`. Each value is a handler for that error:

```ts
processPayment("tok_timeout").pipe(
  Effect.catchTags({
    ExpiredCardError: () =>
      Effect.succeed(new Response("Card expired", { status: 402 })),
    NetworkError: () =>
      Effect.succeed(
        new Response("Payment provider unavailable", { status: 503 }),
      ),
  }),
)
```

TypeScript checks the keys against the error union. A key that does not exist is a type error. Errors you leave out stay in the result type:

```ts
// `ExpiredCardError` and `NetworkError` are removed from the union.
Effect<Response, InvalidTokenError>
```

When you handle every error, the `Error` type becomes `never`:

```ts
Effect<Response, never>
```

`never` means the `Effect` has no expected errors left. The caller has nothing to handle. It does not mean nothing can go wrong. The next lessons cover that.

`handlePayment` below handles only `ExpiredCardError`. Replace `catchTag` with `catchTags`. Handle all three errors:

| Error               | Status | Body                             |
| ------------------- | ------ | -------------------------------- |
| `ExpiredCardError`  | `402`  | `"Card expired"`                 |
| `InvalidTokenError` | `400`  | `"Invalid payment token"`        |
| `NetworkError`      | `503`  | `"Payment provider unavailable"` |
