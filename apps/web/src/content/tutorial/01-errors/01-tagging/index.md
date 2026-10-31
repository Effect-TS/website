---
title: Tag your errors
---

A function signature says what a function needs and what it returns. It does not say what the function can throw:

```ts
const authorizePayment: (token: PaymentToken) => Promise<Authorization>
//                                               └─ How can it fail?
```

`authorizePayment` can fail three ways: the card is expired, the token is not valid, or the provider is unreachable. TypeScript knows none of this. In a `catch (error)` block, `error` is `unknown`. This causes four problems:

- **Blindness**: the caller cannot see which errors exist.
- **Over-specification**: a caller handles an error that is never thrown. It still compiles.
- **Under-specification**: a caller forgets an error that is thrown. It still compiles.
- **Drift**: a new error appears in the function. No caller gets a compile error.

The fix: make each error part of the return type, as a union. A union only works if TypeScript can tell the members apart. These three classes cannot be told apart. They have the same shape:

```ts
class ExpiredCardError extends Error {}
class InvalidTokenError extends Error {}
class NetworkError extends Error {}
```

`Data.TaggedError` gives each error a unique `_tag`. The `_tag` also lets Effect pick the right handler later:

```ts
import { Data } from "effect"

class ExpiredCardError extends Data.TaggedError("ExpiredCardError") {}
```

A class is both a type and a value. One declaration gives the type for signatures and the constructor for creating the error.

Tag all three errors. Use the class name as the tag.
