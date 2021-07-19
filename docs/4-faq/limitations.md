# Limitations

This document lists known limitations for Effect and possible workarounds.

## TypeScript-related

### Tenary statements lead to type error

Instead of `x ? T.fail(A) : T.fail(B)` use 

```ts
T.if_(
  x,
  () => T.fail(A),
  () => T.fail(B)
)
```

[Related TypeScript issue](https://github.com/microsoft/TypeScript/issues/40665).
