---
title: Comparing Effect (TypeScript) with ZIO (Scala)
---

## What are the differences of Effect and ZIO?

- Effect doesn't have the concept of [Aspects](https://zio.dev/next/datatypes/core/zio/#zio-aspect).
	- Aspects in effect terms are known as pipeable functions, in scala they are isolated to have a degree of composability that we can't have in TS
