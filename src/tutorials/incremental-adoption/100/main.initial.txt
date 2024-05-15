import Express from "express"
import { TodoRepository } from "./repo"

const app = Express()

app.use(Express.json() as Express.NextFunction)

const repo = new TodoRepository()

// Creat Todo
app.post("/todos", (req, res) => {
  res.json(repo.create(req.body.text))
})

// Read Todo
app.get("/todos/:id", (req, res) => {
  res.json(repo.get(Number.parseInt(req.params.id)))
})

// Read Todos
app.get("/todos", (_, res) => {
  res.json(repo.getAll())
})

// Update Todo
app.patch("/todos/:id", (req, res) => {
  res.json(repo.update(Number.parseInt(req.params.id), req.body))
})

// Delete Todo
app.delete("/todos/:id", (req, res) => {
  res.json(repo.delete(Number.parseInt(req.params.id)))
})

app.listen(3000, () => {
  console.log("Server listing on port 3000...")
})
