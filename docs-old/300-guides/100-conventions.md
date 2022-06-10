---
title: Conventions
---

## When to use `pipe` vs `T.gen` vs Fluent API

- `T.gen` is useful when there is a lot of branching (if/early return etc)
- `pipe` can be a good forcing function to simplify your code
- `T.gen` is great when migrating code to Effect e.g. by replacing `async`/`await` with generators

## Generic type parameter names
