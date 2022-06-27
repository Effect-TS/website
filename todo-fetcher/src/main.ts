import * as Effect from "@effect/core/io/Effect";
import * as Layer from "@effect/core/io/Layer";
import { pipe } from "@tsplus/stdlib/data/Function";
import { httpServiceContext } from "./http.js";
import { loggerService, loggerServiceContext } from "./logger.js";
import { todoRepo, todoRepoContext } from "./todos.js";

const app = Effect.gen(function* ($) {
  const { getTodosBetween } = yield* $(todoRepo);
  const { log } = yield* $(loggerService);

  const todos = yield* $(getTodosBetween(1, 10));

  for (const todo of todos) {
    yield* $(log(`Todo: ${JSON.stringify(todo)}`));
  }
});

const context = pipe(
  httpServiceContext,
  Layer.andTo(todoRepoContext),
  Layer.and(() => loggerServiceContext)
);

pipe(app, Effect.provideSomeLayer(context), Effect.unsafeRunPromise);
