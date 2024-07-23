import { Array, Data, Effect, Layer, Option, Ref } from "effect"

export class Todo extends Data.TaggedClass("Todo")<{
  readonly id: number
  readonly text: string
  readonly completed: boolean
}> {}

export class TodoNotFoundError extends Data.TaggedError("TodoNotFoundError")<{
  readonly id: number
}> {}

const initialTodos: ReadonlyArray<Todo> = [
  new Todo({ id: 1, text: "Finish homework", completed: false }),
  new Todo({ id: 2, text: "Buy groceries", completed: false }),
  new Todo({ id: 3, text: "Write report", completed: false }),
  new Todo({ id: 4, text: "Clean house", completed: false }),
  new Todo({ id: 5, text: "Pay bills", completed: false })
]

export const make = Effect.gen(function* () {
  const todosRef = yield* Ref.make(initialTodos)

  const getAllTodos = Ref.get(todosRef)

  function getTodo(id: number) {
    return Ref.get(todosRef).pipe(
      Effect.andThen(Array.findFirst((todo) => todo.id === id)),
      Effect.catchTag(
        "NoSuchElementException",
        () => new TodoNotFoundError({ id })
      )
    )
  }

  function createTodo(text: string) {
    return Ref.modify(todosRef, (todos) => {
      const maxTodoId = Array.reduce(todos, 0, (max, todo) =>
        todo.id > max ? todo.id : max
      )
      const newTodo = new Todo({ id: maxTodoId + 1, text, completed: false })
      return [newTodo, Array.append(todos, newTodo)] as const
    })
  }

  function updateTodo(id: number, props: Partial<Omit<Todo, "id">>) {
    return Ref.modify(todosRef, (todos) => {
      const updated: Array<Todo> = []
      let newTodo: Todo | undefined = undefined
      for (const todo of todos) {
        if (todo.id === id) {
          newTodo = new Todo({ ...todo, ...props })
          updated.push(newTodo)
        } else {
          updated.push(todo)
        }
      }
      return [Option.fromNullable(newTodo), updated] as const
    }).pipe(
      Effect.flatten,
      Effect.catchTag(
        "NoSuchElementException",
        () => new TodoNotFoundError({ id })
      )
    )
  }

  function deleteTodo(id: number) {
    return Ref.modify(todosRef, (todos) => {
      const index = Array.findFirstIndex(todos, (todo) => todo.id === id)
      return Option.match(index, {
        onNone: () => [false, todos] as const,
        onSome: (index) => [true, Array.remove(todos, index)] as const
      })
    })
  }

  return {
    get: getTodo,
    getAll: getAllTodos,
    create: createTodo,
    update: updateTodo,
    delete: deleteTodo
  } as const
})

export class TodoRepository extends Effect.Tag("app/TodoRepository")<
  TodoRepository,
  Effect.Effect.Success<typeof make>
>() {
  static Live = Layer.effect(this, make)
}
