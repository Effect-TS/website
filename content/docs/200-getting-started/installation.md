---
title: Installation
---

All of the Effect ecosystem libraries are available on [npm](https://www.npmjs.com/), and can be installed using your favorite package manager.

This installation guide will walk through installing the core Effect runtime, which is available via the `@effect/io` package.

To install the `@effect/io` library:

```sh
npm install @effect/io
# or
yarn add @effect/io
# or
pnpm install @effect/io
```

The Effect ecosystem libraries are designed to be imported using namespace imports.

For example, to import the `Effect` module, you would do the following:

```ts
import * as Effect from "@effect/io/Effect";
```

Now you can begin using the `Effect` module in your code!

```ts twoslash
import * as Effect from "@effect/io/Effect";

const program = Effect.succeed("Hello, World!")

Effect.runCallback(program, (result) => console.log(result));
```
