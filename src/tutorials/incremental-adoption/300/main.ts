import Express from "express"
import { Effect, ManagedRuntime } from "effect"
import { TodoRepository } from "./repo"

const app = Express()

app.use(Express.json() as Express.NextFunction)

const runtime = ManagedRuntime.make(TodoRepository.Live)

// Create Todo
app.post("/todos", (req, res) => {
  TodoRepository.create(req.body.text).pipe(
    Effect.andThen((todo) => res.json(todo)),
    runtime.runPromise
  )
})

// Read Todo
app.get("/todos/:id", (req, res) => {
  const id = Number.parseInt(req.params.id)
  TodoRepository.get(id).pipe(
    Effect.andThen((todo) => res.json(todo)),
    Effect.catchTag("TodoNotFoundError", () =>
      Effect.sync(() => {
        res.status(404).json({ type: "TodoNotFound", id })
      })
    ),
    runtime.runPromise
  )
})

// Read Todos
app.get("/todos", (_, res) => {
  TodoRepository.getAll.pipe(
    Effect.andThen((todos) => res.json(todos)),
    runtime.runPromise
  )
})

// Update Todo
app.patch("/todos/:id", (req, res) => {
  const id = Number.parseInt(req.params.id)
  TodoRepository.update(id, req.body).pipe(
    Effect.andThen((todo) => res.json(todo)),
    Effect.catchTag("TodoNotFoundError", () =>
      Effect.sync(() => {
        res.status(404).json({ type: "TodoNotFound", id })
      })
    ),
    runtime.runPromise
  )
})

// Delete Todo
app.delete("/todos/:id", (req, res) => {
  const id = Number.parseInt(req.params.id)
  TodoRepository.delete(id).pipe(
    Effect.andThen((deleted) => res.json({ deleted })),
    runtime.runPromise
  )
})

const server = app.listen(3000, () => {
  console.log("Server listing on port 3000...")
})

// Graceful Shutdown
process.on("SIGTERM", shutdown)
process.on("SIGINT", shutdown)

function shutdown() {
  server.close(() => {
    runtime.dispose().then(() => {
      process.exit(0)
    })
  })
}