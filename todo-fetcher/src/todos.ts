import * as Effect from "@effect/core/io/Effect";
import * as Schedule from "@effect/core/io/Schedule";
import * as Chunk from "@tsplus/stdlib/collections/Chunk";
import { pipe } from "@tsplus/stdlib/data/Function";
import { Tag } from "@tsplus/stdlib/service/Tag";
import { httpService } from "./http.js";

export class Todo {
  readonly _tag = "Todo";
  constructor(readonly value: unknown) {}
}

export interface TodoRepo
  extends Effect.Effect.Success<typeof makeTodoRepoLive> {}

export const todoRepo = Tag<TodoRepo>();

export const makeTodoRepoLive = Effect.gen(function* ($) {
  const Http = yield* $(httpService);

  const getTodo = (id: number) =>
    pipe(
      Http.request(`https://jsonplaceholder.typicode.com/todos/${id}`),
      Effect.flatMap(Http.jsonBody),
      Effect.map((value) => new Todo(value)),
      Effect.retry(() =>
        pipe(
          Http.defaultRetrySchedule,
          Schedule.whileInput((error) => error._tag !== "JsonBodyError")
        )
      ),
      Effect.orDie
    );

  const getTodosBetween = (from: number, to: number) =>
    Effect.forEachPar(
      () => Chunk.range(from, to),
      (id) => getTodo(id)
    );

  return {
    getTodo,
    getTodosBetween,
  };
});

export const todoRepoContext = Effect.toLayer(todoRepo)(makeTodoRepoLive);
