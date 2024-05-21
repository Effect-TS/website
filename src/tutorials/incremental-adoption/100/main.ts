import Express from "express"
import { Effect } from "effect"
import { TodoRepository } from "./repo"

const app = Express()

app.use(Express.json() as Express.NextFunction)

const repo = new TodoRepository()

// Create Todo
app.post("/todos", (req, res) => {
  Effect.runPromise(repo.create(req.body.text))
    .then((todo) => res.json(todo))
})

/* snip */

app.listen(3000, () => {
  console.log("Server listing on port 3000...")
})
