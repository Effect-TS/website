---
title: Handle one error
---

The `Error` type tells a caller which errors it can handle. `Effect.catchTag` handles one of them. Pass the error's `_tag` and a function that returns an `Effect`:

```ts
processPayment("tok_expiredcard").pipe(
  Effect.catchTag("ExpiredCardError", (error) =>
    Effect.succeed(new Response("Card expired", { status: 402 })),
  ),
)
```

The union guides you. Your editor suggests the available tags. TypeScript rejects a tag that is not in the union.

`.pipe` passes the `Effect` to `Effect.catchTag`. The result is a new `Effect` with that error removed from its type:

```ts
//                                  ┌─ `ExpiredCardError` is removed
//                                  ▼
Effect<Response, InvalidTokenError | NetworkError>
```

Errors flow through the type. Each unhandled error stays in the union. Each handled error leaves it.

An `Effect` is a description. Creating it does not run it. `Effect.runPromise` runs it and returns a `Promise` for the success value.

`handlePayment` below does not handle anything yet. Handle `ExpiredCardError` with a `402` response that says `"Card expired"`.
