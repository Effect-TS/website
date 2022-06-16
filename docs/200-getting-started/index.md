---
title: Getting Started
---

The following is a very very basic intro to get started, the full documentation of `Effect` is still work in progress and all help is greately welcome!

## Installing Effect

`yarn add @effect/core @tsplus/stdlib`

## Using Effect

An `Effect` program is usually comprised of a pure main function, a set of modules that define your program and an unsafe entrypoint to execute it.

Roughly:

```ts twoslash
import * as Effect from "@effect/core/io/Effect";
import * as Exit from "@effect/core/io/Exit";

const main = Effect.succeed(() => console.log("hello world"));

Effect.unsafeRunAsyncWith(main, (exit) => {
    if (Exit.isFailure(exit)) {
        console.error(JSON.stringify(exit.cause));
    }
});
```

## Raising Errors

With `Effect` you can raise errors by using the `fail` function, `Errors` are well typed and `Effect` will accumulate the errors your program may enocounter in its second type parameter:

```ts twoslash
import * as Effect from "@effect/core/io/Effect";
import * as Exit from "@effect/core/io/Exit";
import { pipe } from "@tsplus/stdlib/data/Function";

export class InvalidRand {
    readonly _tag = "InvalidRand";
    constructor(readonly n: number) {}
}

const main = pipe(
    Effect.succeed(() => Math.random()),
    Effect.flatMap((n) => 
      n > 0.5 
        ? Effect.fail(() => new InvalidRand(n)) 
        : Effect.succeed(() => n)
    )
);
```

## Working with Promises

Async functions can be naturally used in `Effect` by leveraging the `tryCatchPromise` constructor:

```ts twoslash
import * as Effect from "@effect/core/io/Effect";

export class FetchError {
  readonly _tag = "FetchError";
  constructor(readonly error: unknown) {}
}

export const request = (
  input: RequestInfo, 
  init?: RequestInit | undefined
) =>
  Effect.tryCatchPromise(
    () => fetch(input, init),
    (error) => new FetchError(error)
  );
```

## Working with Interruptible Async

When working with async operations that require interruption using `Effect.tryCatchPromise` is no longer an option and we need to use the lower level `asyncInterrupt`

```ts twoslash
import * as Effect from "@effect/core/io/Effect";
import * as Either from "@tsplus/stdlib/data/Either";

export class FetchError {
  readonly _tag = "FetchError";
  constructor(readonly error: unknown) {}
}

export const request = (
  input: RequestInfo, 
  init?: RequestInit | undefined
) =>
  Effect.asyncInterrupt<never, FetchError, Response>((resume) => {
    const controller = new AbortController();
    fetch(input, { ...(init ?? {}), signal: controller.signal })
      .then((response) => {
        resume(Effect.succeed(() => response));
      })
      .catch((error) => {
        resume(Effect.fail(() => new FetchError(error)));
      });
    return Either.left(Effect.succeed(() => {
      controller.abort();
    }));
  });
```

## Module Wrappers

Putting together all we've seen so far we can create a minimal wrapper module for `fetch` as follows:

```ts twoslash
import * as Effect from "@effect/core/io/Effect";
import * as Either from "@tsplus/stdlib/data/Either";
import { pipe } from "@tsplus/stdlib/data/Function";

export class FetchError {
  readonly _tag = "FetchError";
  constructor(readonly error: unknown) {}
}

export const request = (input: RequestInfo, init?: RequestInit | undefined) =>
  Effect.asyncInterrupt<never, FetchError, Response>((resume) => {
    const controller = new AbortController();
    fetch(input, { ...(init ?? {}), signal: controller.signal })
      .then((response) => {
        resume(Effect.succeed(() => response));
      })
      .catch((error) => {
        resume(Effect.fail(() => new FetchError(error)));
      });
    return Either.left(Effect.succeed(() => {
      controller.abort();
    }));
  });

export class JsonBodyError {
  readonly _tag = "JsonBodyError";
  constructor(readonly error: unknown) {}
}

export const jsonBody = (input: Response) =>
  Effect.tryCatchPromise(
    (): Promise<unknown> => input.json(),
    (error) => new JsonBodyError(error)
  );
```

## Using The Wrapper Modules

Once we have a module we can freely use it in our program to define progressively higher level modules

```ts twoslash
// @filename: http.ts
import * as Effect from "@effect/core/io/Effect";
import * as Either from "@tsplus/stdlib/data/Either";
import { pipe } from "@tsplus/stdlib/data/Function";

export class FetchError {
  readonly _tag = "FetchError";
  constructor(readonly error: unknown) {}
}

export const request = (input: RequestInfo, init?: RequestInit | undefined) =>
  Effect.asyncInterrupt<never, FetchError, Response>((resume) => {
    const controller = new AbortController();
    fetch(input, { ...(init ?? {}), signal: controller.signal })
      .then((response) => {
        resume(Effect.succeed(() => response));
      })
      .catch((error) => {
        resume(Effect.fail(() => new FetchError(error)));
      });
    return Either.left(Effect.succeed(() => {
      controller.abort();
    }));
  });

export class JsonBodyError {
  readonly _tag = "JsonBodyError";
  constructor(readonly error: unknown) {}
}

export const jsonBody = (input: Response) =>
  Effect.tryCatchPromise(
    (): Promise<unknown> => input.json(),
    (error) => new JsonBodyError(error)
  );
// @filename: index.ts
// ---cut---
import * as Effect from "@effect/core/io/Effect";
import { pipe } from "@tsplus/stdlib/data/Function";
import * as Http from "./http.js";

export class Todo {
  readonly _tag = "Todo";
  constructor(readonly value: unknown) {}
}

export const getTodo = (id: number) =>
  pipe(
    Http.request(`https://jsonplaceholder.typicode.com/todos/${id}`),
    Effect.flatMap(Http.jsonBody),
    Effect.map((value) => new Todo(value))
  );

export const getTodos = (ids: number[]) =>
  Effect.forEachPar(
    () => ids,
    (id) => getTodo(id)
  );
```

## Using Context to Inject and Access Dependencies

Sometimes you may want to carry those modules in context to achieve testability and effect tracking:


```ts twoslash
// @filename: http.ts
import * as Effect from "@effect/core/io/Effect";
import * as Either from "@tsplus/stdlib/data/Either";
import { pipe } from "@tsplus/stdlib/data/Function";

export class FetchError {
  readonly _tag = "FetchError";
  constructor(readonly error: unknown) {}
}

export const request = (input: RequestInfo, init?: RequestInit | undefined) =>
  Effect.asyncInterrupt<never, FetchError, Response>((resume) => {
    const controller = new AbortController();
    fetch(input, { ...(init ?? {}), signal: controller.signal })
      .then((response) => {
        resume(Effect.succeed(() => response));
      })
      .catch((error) => {
        resume(Effect.fail(() => new FetchError(error)));
      });
    return Either.left(Effect.succeed(() => {
      controller.abort();
    }));
  });

export class JsonBodyError {
  readonly _tag = "JsonBodyError";
  constructor(readonly error: unknown) {}
}

export const jsonBody = (input: Response) =>
  Effect.tryCatchPromise(
    (): Promise<unknown> => input.json(),
    (error) => new JsonBodyError(error)
  );
// @filename: index.ts
// ---cut---
import * as Effect from "@effect/core/io/Effect";
import * as Layer from "@effect/core/io/Layer";
import * as Chunk from "@tsplus/stdlib/collections/Chunk";
import { pipe } from "@tsplus/stdlib/data/Function";
import { Tag } from "@tsplus/stdlib/service/Tag";
import * as Http from "./http.js";

export class Todo {
  readonly _tag = "Todo";
  constructor(readonly value: unknown) {}
}

export interface TodoRepo {
  readonly getTodo: (id: number) => 
    Effect.Effect<never, Http.FetchError | Http.JsonBodyError, Todo>
  readonly getTodos: (ids: number[]) => 
    Effect.Effect<never, Http.FetchError | Http.JsonBodyError, Chunk.Chunk<Todo>>
}

export const TodoRepo = Tag<TodoRepo>()

export const program = Effect.gen(function* ($) {
  const Todos = yield* $(TodoRepo)

  const todos = yield* $(Todos.getTodos([1, 2, 3, 4]))

  for (const todo of todos) {
    yield* $(Effect.log(() => `todo: ${JSON.stringify(todo)}`))
  }
  
  return Chunk.size(todos)
})

export const LiveTodoRepo = Layer.fromEffect(TodoRepo, () => 
  Effect.succeed(() => {
      const getTodo = (id: number) =>
        pipe(
          Http.request(`https://jsonplaceholder.typicode.com/todos/${id}`),
          Effect.flatMap(Http.jsonBody),
          Effect.map((value) => new Todo(value))
        );

    const getTodos = (ids: number[]) =>
      Effect.forEachPar(
        () => ids,
        (id) => getTodo(id)
      );

    return {
      getTodo,
      getTodos
    };
  })
)

export const main = pipe(
  program,
  Effect.provideSomeLayer(LiveTodoRepo)
)
```

## Trating Failures as Defects

`Effect` programs can also fail for non predictable reasons, or generaly reasons that don't provide us with a natural meaning of recovering, for example in the case above we may say that the `Http.FetchError | Http.JsonBodyError` error is an implementaion detail of the `TodoRepo` service so we wouldn't like it to get leaked to the API consumer but internally in the `TodoRepo` implementation we may use them to refine retry logic. For those situation `orDie` is what you are looking for:

```ts twoslash
// @filename: http.ts
import * as Effect from "@effect/core/io/Effect";
import * as Either from "@tsplus/stdlib/data/Either";
import { pipe } from "@tsplus/stdlib/data/Function";

export class FetchError {
  readonly _tag = "FetchError";
  constructor(readonly error: unknown) {}
}

export const request = (input: RequestInfo, init?: RequestInit | undefined) =>
  Effect.asyncInterrupt<never, FetchError, Response>((resume) => {
    const controller = new AbortController();
    fetch(input, { ...(init ?? {}), signal: controller.signal })
      .then((response) => {
        resume(Effect.succeed(() => response));
      })
      .catch((error) => {
        resume(Effect.fail(() => new FetchError(error)));
      });
    return Either.left(Effect.succeed(() => {
      controller.abort();
    }));
  });

export class JsonBodyError {
  readonly _tag = "JsonBodyError";
  constructor(readonly error: unknown) {}
}

export const jsonBody = (input: Response) =>
  Effect.tryCatchPromise(
    (): Promise<unknown> => input.json(),
    (error) => new JsonBodyError(error)
  );
// @filename: index.ts
// ---cut---
import * as Effect from "@effect/core/io/Effect";
import * as Layer from "@effect/core/io/Layer";
import * as Chunk from "@tsplus/stdlib/collections/Chunk";
import { pipe } from "@tsplus/stdlib/data/Function";
import { Tag } from "@tsplus/stdlib/service/Tag";
import * as Http from "./http.js";

export class Todo {
  readonly _tag = "Todo";
  constructor(readonly value: unknown) {}
}

export interface TodoRepo {
  readonly getTodo: (id: number) => Effect.Effect<never, never, Todo>
  readonly getTodos: (ids: number[]) => Effect.Effect<never, never, Chunk.Chunk<Todo>>
}

export const TodoRepo = Tag<TodoRepo>()

export const program = Effect.gen(function* ($) {
  const Todos = yield* $(TodoRepo)

  const todos = yield* $(Todos.getTodos([1, 2, 3, 4]))

  for (const todo of todos) {
    yield* $(Effect.log(() => `todo: ${JSON.stringify(todo)}`))
  }
  
  return Chunk.size(todos)
})

export const LiveTodoRepo = Layer.fromEffect(TodoRepo, () => 
  Effect.succeed(() => {
      const getTodo = (id: number) =>
        pipe(
          Http.request(`https://jsonplaceholder.typicode.com/todos/${id}`),
          Effect.flatMap(Http.jsonBody),
          Effect.map((value) => new Todo(value)),
          Effect.orDie
        );

    const getTodos = (ids: number[]) =>
      Effect.forEachPar(
        () => ids,
        (id) => getTodo(id)
      );

    return {
      getTodo,
      getTodos
    };
  })
)

export const main = pipe(
  program,
  Effect.provideSomeLayer(LiveTodoRepo)
)
```