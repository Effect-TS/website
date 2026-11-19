---
title: Catch a defect at a boundary
---

Defects stop the computation they belong to. Most code leaves them alone. A few places can contain one safely.

An HTTP handler is such a boundary for `DoubleCaptureError`. It can end the current request with a `500` response. It does not resume the payment. The server keeps handling other requests.

`Effect.catchDefect` runs a handler when an `Effect` stops with a defect. The handler receives an `unknown` value. Defects are not in the `Error` type, so TypeScript cannot know their shape. The handler must check the value at runtime. It must send anything it does not know back to `Effect.die`. Continuing would be unsafe.

```ts
processPayment("tok_authorized").pipe(
  Effect.catchDefect((defect) => {
    if (defect instanceof DoubleCaptureError) {
      return Effect.succeed(
        new Response(`${defect.id} already captured`, { status: 500 }),
      )
    }

    return Effect.die(defect)
  }),
)
```

`catchDefect` leaves the expected errors in the type. Handle those with `Effect.catchTag` or `Effect.catchTags`:

```ts
Effect<Response, ExpiredCardError | InvalidTokenError | NetworkError>
```

`catchDefect` does not resume the code after the defect. Its handler supplies a new outcome for the `Effect` it wraps. The payment stays stopped. Only the HTTP request completes, with a `500`.

`handleRequest` below returns its `Effect` unchanged. Contain `DoubleCaptureError` with a `500` response that says `"<id> already captured"`. Send every other defect back to `Effect.die`.

## Review

Read `Effect<Success, Error>` as a contract. `Success` is the result. The `Error` union holds the expected errors still open to the caller.

| When                                         | What to do                                                                                     | Effect on the type                                      |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| At least one caller may recover              | Model an expected error with `Data.TaggedError` and return it with `yield*`                    | The error enters the `Error` union                      |
| A caller handles an expected error           | Use `Effect.catchTag` or `Effect.catchTags`                                                    | The handled error leaves the `Error` union              |
| A boundary chooses not to recover            | Use `Effect.catchTag` with `Effect.die` for selected errors, or `Effect.orDie` for all of them | Those errors become defects and leave the `Error` union |
| An invariant breaks                          | Use `Effect.die`                                                                               | The defect enters the `Cause`, not the `Error` union    |
| A boundary can safely contain a known defect | Use `Effect.catchDefect` and send unknown defects back to `Effect.die`                         | Expected errors remain unchanged                        |

## Keep reading

- [The Effect Type](/docs/v4/getting-started/the-effect-type/)
- [Using Generators](/docs/v4/getting-started/using-generators/)
- [Expected Errors](/docs/v4/error-management/expected-errors/)
- [Yieldable Errors](/docs/v4/error-management/yieldable-errors/)
- [Unexpected Errors](/docs/v4/error-management/unexpected-errors/)
- [Running Effects](/docs/v4/getting-started/running-effects/)
