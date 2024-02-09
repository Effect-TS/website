import { Context, Layer, Effect, Runtime } from "effect"
import express from "express"

// Define Express as a service
class Express extends Context.Tag("Express")<
  Express,
  ReturnType<typeof express>
>() {}

interface Todo {
  readonly id: number
  readonly title: string
  readonly completed: boolean
}

// Define the repository as a service
class TodoRepository extends Context.Tag("TodoRepository")<
  TodoRepository,
  {
    readonly getTodos: Effect.Effect<Array<Todo>>
    readonly getTodo: (id: number) => Effect.Effect<Todo | null>
  }
>() {}

// Define a main route that returns all Todos
// $ExpectType Layer<never, never, Express | TodoRepository>
const IndexRouteLive = Layer.effectDiscard(
  Effect.gen(function* (_) {
    const app = yield* _(Express)
    const runFork = Runtime.runFork(yield* _(Effect.runtime<TodoRepository>()))

    app.get("/", (_, res) => {
      runFork(
        Effect.gen(function* (_) {
          const repo = yield* _(TodoRepository)
          const todos = yield* _(repo.getTodos)
          res.json(todos)
        })
      )
    })
  })
)

// Define a route that returns a Todo by its ID
// $ExpectType Layer<never, never, Express | TodoRepository>
const TodoByIdRouteLive = Layer.effectDiscard(
  Effect.gen(function* (_) {
    const app = yield* _(Express)
    const runFork = Runtime.runFork(yield* _(Effect.runtime<TodoRepository>()))

    app.get("/todo/:id", (req, res) => {
      const id = req.params.id
      runFork(
        Effect.gen(function* (_) {
          const repo = yield* _(TodoRepository)
          const todo = yield* _(repo.getTodo(Number(id)))
          res.json(todo)
        })
      )
    })
  })
)

// Server Setup
// $ExpectType Layer<never, never, Express>
const ServerLive = Layer.scopedDiscard(
  Effect.gen(function* (_) {
    const port = 3001
    const app = yield* _(Express)
    yield* _(
      Effect.acquireRelease(
        Effect.sync(() =>
          app.listen(port, () =>
            console.log(`Example app listening on port ${port}`)
          )
        ),
        (server) => Effect.sync(() => server.close())
      )
    )
  })
)

// Setting Up Express
// $ExpectType Layer<Express, never, never>
const ExpressLive = Layer.sync(Express, () => express())

// Merge routes into a single layer
// $ExpectType Layer<never, never, Express | TodoRepository>
const RouterLive = Layer.mergeAll(IndexRouteLive, TodoByIdRouteLive)

// Combine all layers to create the final application layer
// $ExpectType Layer<never, never, TodoRepository>
const AppLive = ServerLive.pipe(
  Layer.provide(RouterLive),
  Layer.provide(ExpressLive)
)

// Test Data for TodoRepository
const testData = [
  {
    id: 1,
    title: "delectus aut autem",
    completed: false
  },
  {
    id: 2,
    title: "quis ut nam facilis et officia qui",
    completed: false
  },
  {
    id: 3,
    title: "fugiat veniam minus",
    completed: false
  }
]

// Create a layer with test data
// $ExpectType Layer<TodoRepository, never, never>
const TodoRepositoryTest = Layer.succeed(TodoRepository, {
  getTodos: Effect.succeed(testData),
  getTodo: (id) =>
    Effect.succeed(testData.find((todo) => todo.id === id) || null)
})

const Test = AppLive.pipe(Layer.provide(TodoRepositoryTest))

Effect.runFork(Layer.launch(Test))
