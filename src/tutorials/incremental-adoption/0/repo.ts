export interface Todo {
  readonly id: number
  readonly text: string
  readonly completed: boolean
}

export class TodoRepository {
  readonly todos: Array<Todo> = [
    { id: 1, text: "Finish homework", completed: false },
    { id: 2, text: "Buy groceries", completed: false },
    { id: 3, text: "Write report", completed: false },
    { id: 4, text: "Clean house", completed: false },
    { id: 5, text: "Pay bills", completed: false }
  ]

  get(id: number): Promise<Todo | undefined> {
    const todo = this.todos.find((todo) => todo.id === id)
    return Promise.resolve(todo)
  }

  getAll(): Promise<ReadonlyArray<Todo>> {
    return Promise.resolve(this.todos)
  }

  async create(text: string): Promise<Todo> {
    const todos = await this.getAll()
    const maxId = todos.reduce((max, todo) =>
      todo.id > max ? todo.id : max,
    0)
    const newTodo = { id: maxId + 1, text, completed: false }
    this.todos.push(newTodo)
    return Promise.resolve(newTodo)
  }

  async update(
    id: number,
    props: Partial<Omit<Todo, "id">>
  ): Promise<Todo | undefined> {
    const todo = await this.get(id)
    if (todo) {
      Object.assign(todo, props)
      return Promise.resolve(todo)
    }
    return Promise.resolve(undefined)
  }

  delete(id: number): Promise<boolean> {
    const index = this.todos.findIndex((todo) => todo.id === id)
    if (index !== -1) {
      this.todos.splice(index, 1)
      return Promise.resolve(true)
    }
    return Promise.resolve(false)
  }
}
