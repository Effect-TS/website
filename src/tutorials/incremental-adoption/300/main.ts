import Express from "express"
import { Effect } from "effect"
import { TodoRepository } from "./repo"

const app = Express()

app.use(Express.json() as Express.NextFunction)

const repo = new TodoRepository()


// Create Todo
app.post("/todos", (req, res) => {
  repo.create(req.body.text).then((todo) => res.json(todo))
})

// Read Todo
app.get("/todos/:id", (req, res) => {
  const id = Number.parseInt(req.params.id)
  repo.get(id).then((todo) => res.json(todo))
})

// Read Todos
app.get("/todos", (_, res) => {
  repo.getAll().then((todos) => res.json(todos))
})

// Update Todo
app.patch("/todos/:id", (req, res) => {
  const id = Number.parseInt(req.params.id)
  repo.update(id, req.body).then((todo) => res.json(todo))
})

// Delete Todo
app.delete("/todos/:id", (req, res) => {
  const id = Number.parseInt(req.params.id)
  repo.delete(id).then((deleted) => res.json(deleted))
})

app.listen(3000, () => {
  console.log("Server listing on port 3000...")
})
