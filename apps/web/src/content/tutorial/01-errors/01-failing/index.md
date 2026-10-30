---
title: Failing
---

An `Effect` can fail with an error you define.

`program` succeeds. Make it fail with `NotFound`:

```ts
Effect.fail(new NotFound())
```
