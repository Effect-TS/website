import * as Effect from "@effect/core/io/Effect";
import * as Layer from "@effect/core/io/Layer";
import { pipe } from "@tsplus/stdlib/data/Function";
import { HttpServiceLive } from "./http.js";
import { LoggerService, LoggerServiceLive } from "./logger.js";
import { TodoRepo, TodoRepoLive } from "./todos.js";

const App = Effect.gen(function* ($) {
  const { getTodosBetween } = yield* $(TodoRepo);
  const { log } = yield* $(LoggerService);

  const todos = yield* $(getTodosBetween(1, 10));

  for (const todo of todos) {
    yield* $(log(`Todo: ${JSON.stringify(todo)}`));
  }
});

const AppContextLive = pipe(
  HttpServiceLive,
  Layer.andTo(TodoRepoLive),
  Layer.and(() => LoggerServiceLive)
);

pipe(App, Effect.provideSomeLayer(AppContextLive), Effect.unsafeRunPromise);
