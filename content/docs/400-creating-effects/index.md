---
title: Creating Effects
---

The `Effect` datatype was designed to be a completely type-safe representation of any program. To that end, an `Effect` must be able to represent both programs that succeed with some value or programs that fail with some error. To be able to represent such programs with Effect, we must first learn the various ways to create (or "construct") an `Effect`.

In this section, we will walk you through some of the most common constructors that you will likely use. You will learn:

  - How to create Effects which represent programs that succeed with some value
  - How to create Effects which represent programs that fail with some error

For a full listing of all available constructors, checkout the `Effect` [API documentation](https://effect-ts.github.io/io/modules/Effect.ts.html#constructors).
