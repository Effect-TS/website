---
title: Limitations
---

This document lists known limitations for Effect and possible workarounds.

## TypeScript-related

### Tenary statements can lead to type error especially when used as arguments calling functions with overloads

Instead of `x ? T.fail(A) : T.fail(B)` use

```ts
T.if_(
  x,
  () => T.fail(A),
  () => T.fail(B),
)
```

or

```ts
T.suspend(() => (x ? T.fail(A) : T.fail(B)))
```

[Related TypeScript issue](https://github.com/microsoft/TypeScript/issues/40665).


### Type-inference gotchas

- Special case when using `void` in output type (TODO elaborate @mikearnaldi)

