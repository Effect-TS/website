---
title: Recovering
---

`catchTag` handles one kind of error by its `_tag`.

Make `program` succeed with `"guest"`:

```ts
Effect.catchTag("NotFound", () => Effect.succeed("guest"))
```
