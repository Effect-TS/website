---
title: Turn errors into defects
---

`processPayment` exposes typed errors because some callers can recover from them. Other callers cannot. A nightly reconciliation job may choose to stop and alert its owner when any payment returns an error.

The job makes this choice where it calls `processPayment`. This is a **boundary**: the point where reusable Effect code meets the application code that decides what happens next.

`Effect.orDie` makes the choice explicit. It converts every typed error into a defect. The `Error` type becomes `never`:

```ts
const reconcile: Effect<Response, never> = processPayment(
  "tok_expiredcard",
).pipe(Effect.orDie)
```

`processPayment` itself does not change. Its other callers still see the three typed errors. `Effect.orDie` changes only `reconcile`.

A caller is not forced to recover from every typed error. It has three options:

- Let the errors propagate.
- Convert selected errors into defects with `Effect.catchTag` and `Effect.die`.
- Convert the whole error channel with `Effect.orDie`.

`reconcile` below still has the three typed errors. Convert them to defects.
