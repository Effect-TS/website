---
title: Two errors
---

`program` can fail with `NotFound` or `Forbidden`. Each `catchTag` handles one.

Handle `Forbidden` too. It must recover with `"blocked"`:

```ts
Effect.catchTag("Forbidden", () => Effect.succeed("blocked"))
```
