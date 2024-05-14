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

  get(id: number): Todo | undefined {
    return this.todos.find((todo) => todo.id === id)
  }

  getAll(): ReadonlyArray<Todo> {
    return this.todos
  }

  create(text: string): Todo {
    const maxId = this.todos.reduce((max, todo) => todo.id > max ? todo.id : max, 0)
    const newTodo = { id: maxId + 1, text, completed: false }
    this.todos.push(newTodo)
    return newTodo
  }

  update(id: number, props: Partial<Omit<Todo, "id">>): Todo | undefined {
    const todo = this.todos.find((todo) => todo.id === id)
    if (todo) {
      Object.assign(todo, props)
      return todo
    }
    return undefined
  }

  delete(id: number): boolean {
    const initialLength = this.todos.length
    this.todos.filter((todo) => todo.id !== id)
    return this.todos.length < initialLength
  }
}
