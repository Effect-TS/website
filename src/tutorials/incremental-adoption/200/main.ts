import Express from "express"
import { Effect } from "effect"
import { TodoRepository } from "./repo"

const app = Express()

app.use(Express.json() as Express.NextFunction)

const repo = new TodoRepository()

// Create Todo
app.post("/todos", (req, res) => {
  repo.create(req.body.text).pipe(
    Effect.andThen((todo) => res.json(todo)),
    Effect.catchTag("CreateTodoError", (error) =>
      Effect.sync(() => {
        res.status(404).json({
          type: error._tag,
          text: error.text ?? ""
        })
      })
    ),
    Effect.runPromise
  )
})

/* snip */

app.listen(3000, () => {
  console.log("Server listing on port 3000...")
})
