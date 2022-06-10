---
title: Error Handling
---

## Best Practices

- never use `any` or `unknown` in the error type channel, the error is either typed `MyError` or it's an unknown exception (a defect, to be raised via `die`).
