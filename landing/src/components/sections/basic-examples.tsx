"use client"

import * as Tabs from "@radix-ui/react-tabs"
import { Divider } from "../layout/divider"
import { Logo } from "../atoms/logo"
import { Code } from "../layout/code"

export const BasicExamples = () => {
  return (
    <div className="flex flex-col items-start md:items-center pt-8">
      <p className="mt-6 mb-6 md:mb-10 px-4 md:text-center">
        Effect helps you with handling errors, async code, concurrency,
        streams and much more.
      </p>
      <Tabs.Root
        defaultValue={examples[0].name}
        className="w-full flex flex-col"
      >
        <div className="relative">
          <Tabs.List className="flex relative z-10 items-center px-4 md:justify-center overflow-x-auto gap-4 -mb-px hide-scrollbar">
            {examples.map(({ name }, index) => (
              <Tabs.Trigger
                key={index}
                value={name}
                className="border-b whitespace-nowrap border-transparent data-[state=active]:border-white data-[state=active]:text-white pb-2 tab-hover"
              >
                {name}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
          <Divider />
          <div className="absolute inset-y-0 w-4 left-0 bg-gradient-to-r from-zinc-800 z-10" />
          <div className="absolute inset-y-0 w-4 right-0 bg-gradient-to-l from-zinc-900 z-10" />
        </div>
        {examples.map(({ name, withoutEffect, withEffect }, index) => (
          <Tabs.Content
            key={index}
            value={name}
            className="grow p-4 pt-8 md:p-12 grid grid-cols-1 gap-y-10 md:grid-cols-2 gap-6 data-[state=inactive]:absolute"
          >
            <div className="flex flex-col items-center gap-6">
              <h4 className="font-display text-2xl text-white">
                Without Effect
              </h4>
              <Code
                tabs={[
                  {
                    name: withoutEffect.fileName,
                    content: withoutEffect.code
                  }
                ]}
                terminal={{
                  run: "Run snippet",
                  command: withoutEffect.command,
                  result: withoutEffect.result
                }}
              />
            </div>
            <div className="flex flex-col items-center gap-6">
              <h4 className="font-display text-2xl text-white">
                With <span className="sr-only">Effect</span>
                <Logo className="h-7 inline-block ml-1 -mt-1" />
              </h4>
              <Code
                tabs={[
                  { name: withEffect.fileName, content: withEffect.code }
                ]}
                terminal={{
                  run: "Run snippet",
                  command: withEffect.command,
                  result: withEffect.result
                }}
              />
            </div>
          </Tabs.Content>
        ))}
      </Tabs.Root>
    </div>
  )
}

function randomElement<A>(array: Array<A>): A {
  return array[Math.floor(Math.random() * array.length)]
}

const examples = [
  {
    name: "Sync code",
    withoutEffect: {
      fileName: "index.ts",
      code: `\
const main = () => {
  console.log('Hello, World!')
}

main()\
      `,
      command: "bun src/index.ts",
      result: "Hello, World!"
    },
    withEffect: {
      fileName: "index.ts",
      code: `\
import { Console, Effect } from 'effect'

const main = Console.log('Hello, World!')

Effect.runSync(main)\
      `,
      command: "bun src/index.ts",
      result: "Hello, World!"
    }
  },
  {
    name: "Async code",
    withoutEffect: {
      fileName: "index.ts",
      code: `\
const sleep = (ms: number) =>
  new Promise((resolve) =>
    setTimeout(resolve, ms)
  )

const main = async () => {
  await sleep(1000)
  console.log('Hello, World!')
}

main()\
      `,
      command: "bun src/index.ts",
      result: "Hello, World!"
    },
    withEffect: {
      fileName: "index.ts",
      code: `\
import { Console, Effect } from 'effect'

const main = Effect.sleep(1000).pipe(
  Effect.andThen(Console.log('Hello, World!'))
)

Effect.runPromise(main)\
      `,
      command: "bun src/index.ts",
      result: "Hello, World!"
    }
  },
  {
    name: "Error Handling",
    withoutEffect: {
      fileName: "index.ts",
      code: `\
class CustomError extends Error {
  constructor(readonly value: number) {}
}

// Return type of \`number\` doesn't reflect the
// fact that the function can throw
const maybeFail = (): number => {
  const value = Math.random()
  if (value > 0.5) {
    throw new CustomError(value)
  }
  return value
}


const main = () => {
  try {
    const value = maybeFail()
    console.log(\`Got value \${value}\`)
  } catch (error) {
    if (error instanceof CustomError) {
      console.error(\`Oops! Got value \${error.value}\`)
    } else {
      console.error('No idea what happened!')
    }
  }
}

main()\
      `,
      command: "bun src/index.ts",
      result: randomElement(["Oops! Got value 0.7"])
    },
    withEffect: {
      fileName: "index.ts",
      code: `\
import { Console, Effect } from 'effect'

class CustomError {
  readonly _tag = 'CustomError'
  constructor(readonly value: number) {}
}

const maybeFail: Effect.Effect<
  number,
  CustomError // type safety
> = Effect.sync(() => Math.random()).pipe(
  Effect.andThen((value) =>
    value > 0.5
      ? Effect.fail(new CustomError(value))
      : Effect.succeed(value),
  ),
)


const main = maybeFail.pipe(
  Effect.andThen((value) =>
    Console.log(\`Got value \${value}\`),
  ),
  Effect.catchTag("CustomError", (error) =>
    Console.error(\`Oops! Got value \${error.value}\`),
  ),
)


Effect.runPromise(main)\
      `,
      command: "bun src/index.ts",
      result: randomElement(["Got value 0.3"])
    }
  },
  {
    name: "Interruption",
    withoutEffect: {
      fileName: "index.ts",
      code: `\
const sleep = <A>(
  ms: number,
  signal: AbortSignal,
): Promise<A> =>
  new Promise<A>((resolve, reject) => {
    const timeout = setTimeout(resolve, ms)
    signal.addEventListener("abort", () => {
      clearTimeout(timeout)
      reject("Aborted!")
    })
  })

async function main() {
  await sleep(1000, AbortSignal.timeout(500))
  console.log("Hello")
}

main()\
      `,
      command: "bun src/index.ts",
      result: "Aborted!"
    },
    withEffect: {
      fileName: "index.ts",
      code: `\
import { Console, Effect } from "effect"

const main = Effect.sleep(1000).pipe(
  Effect.andThen(Console.log("Hello")),
  Effect.timeoutFail({
    duration: 500,
    onTimeout: () => "Aborted!"
  })
)

Effect.runPromise(main)\
      `,
      command: "bun src/index.ts",
      result: "Aborted!"
    }
  },
  {
    name: "Retry",
    withoutEffect: {
      fileName: "index.ts",
      code: `\
async function getUser(id: number, retries = 3) {
  try {
    const response = await fetch(\`/users/\${id}\`)
    if (!response.ok) throw new Error()
    return await response.json()
  } catch (error) {
    if (retries === 0) {
      throw error
    }
    return getUser(id, retries - 1)
  }
}

async function main() {
  const user = await getUser(1)
  console.log("Got user", user)
}

main()
      `,
      command: "bun src/index.ts",
      result: "Got user { id: 1, name: 'John' }"
    },
    withEffect: {
      fileName: "index.ts",
      code: `import { FetchHttpClient, HttpClient } from "@effect/platform"
import { Console, Effect, Layer } from "effect"

const makeUsers = Effect.gen(function*() {
  const client = (yield* HttpClient.HttpClient).pipe(
    HttpClient.filterStatusOk
  )

  const findById = (id: number) =>
    client.get(\`/users/\${id}\`).pipe(
      Effect.andThen((response) => response.json),
      Effect.retry({ times: 3 })
    )

  return { findById } as const
})

class Users extends Effect.Tag("Users")<Users, Effect.Effect.Success<typeof makeUsers>>() {
  static Live = Layer.effect(Users, makeUsers).pipe(
    Layer.provide(FetchHttpClient.layer)
  )
}

const main = Users.findById(1).pipe(
  Effect.andThen((user) => Console.log("Got user", user))
)`,
      command: "bun src/index.ts",
      result: "Got user { id: 1, name: 'John' }"
    }
  },
  {
    name: "Concurrency",
    withoutEffect: {
      fileName: "index.ts",
      code: `\
declare const getUser: (
  id: number,
) => Promise<unknown>

function forEach<A, B>(
  items: Array<A>,
  concurrency: number,
  f: (a: A) => Promise<B>,
): Promise<Array<B>> {
  let index = 0
  const results: Array<B> = new Array(
    items.length,
  )
  async function process(index: number) {
    const next = items[index]
    results[index] = await f(next)
  }
  async function worker() {
    while (index < items.length) {
      await process(index++)
    }
  }
  return Promise.all(
    Array.from({ length: concurrency }, worker),
  ).then(() => results)
}

const ids = Array.from(
  { length: 10 },
  (_, i) => i,
)

async function main() {
  const users = await forEach(ids, 3, (id) =>
    getUser(id),
  )
  console.log("Got users", users)
}

main()\
      `,
      command: "bun src/index.ts",
      result: "Got users [ ... ]"
    },
    withEffect: {
      fileName: "index.ts",
      code: `\
import { Console, Effect } from "effect"

declare const getUser: (
  id: number,
) => Effect.Effect<unknown, Error>

const ids = Array.from(
  { length: 10 },
  (_, i) => i,
)

const main = Effect.forEach(
  ids,
  (id) => getUser(id),
  { concurrency: 3 },
).pipe(
  Effect.andThen((users) =>
    Console.log("Got users", users),
  ),
)

Effect.runPromise(main)\
      `,
      command: "bun src/index.ts",
      result: "Got users [ ... ]"
    }
  },
  {
    // pipe, generators
    name: "Composition",
    withoutEffect: {
      fileName: "index.ts",
      code: `\
// configuration has to be added to the type signature
const getTodos = (
  ids: Iterable<number>,
  concurrency: number,
  signal?: AbortSignal,
): Promise<any[]> =>
  forEach(ids, concurrency, (id) =>
    withRetries(3, () => getTodo(id, signal)),
  )

const getTodo = (
  id: number,
  signal?: AbortSignal,
): Promise<any> =>
  abortable(
    (signal) =>
      jsonOk(() =>
        fetch(
          \`https://jsonplaceholder.typicode.com/todos/\${id}\`,
          { signal },
        ),
      ),
    mergeAbortSignal(
      AbortSignal.timeout(1000),
      signal,
    ),
  )

async function main() {
  const ids = Array.from(
    { length: 10 },
    (_, i) => i + 1,
  )
  const todos = await getTodos(
    ids,
    3,
    AbortSignal.timeout(10000)
  )
  console.log("Got todos", todos)
}

main()

// helpers

async function jsonOk(
  request: () => Promise<Response>,
): Promise<any> {
  const res = await request()
  if (!res.ok) throw new Error("Response not ok")
  return res.json()
}

function forEach<A, B>(
  items: Iterable<A>,
  concurrency: number,
  f: (a: A) => Promise<B>,
): Promise<Array<B>> {
  let index = 0
  const itemsArray = Array.from(items)
  const results: Array<B> = new Array(
    itemsArray.length,
  )
  async function process(index: number) {
    const next = itemsArray[index]
    results[index] = await f(next)
  }
  async function worker() {
    while (index < itemsArray.length) {
      await process(index++)
    }
  }
  return Promise.all(
    Array.from({ length: concurrency }, worker),
  ).then(() => results)
}

async function withRetries<A>(
  retries: number,
  f: () => Promise<A>,
): Promise<A> {
  try {
    return f()
  } catch (error) {
    if (retries === 0) {
      throw error
    }
    return withRetries(retries - 1, f)
  }
}

async function abortable<A>(
  f: (signal: AbortSignal) => Promise<A>,
  parentSignal?: AbortSignal,
): Promise<A> {
  if (parentSignal?.aborted) {
    throw new DOMException(
      "Aborted",
      "AbortError",
    )
  }
  const controller = new AbortController()
  parentSignal?.addEventListener("abort", () =>
    controller.abort(),
  )
  return await f(controller.signal)
}

function mergeAbortSignal(
  childSignal: AbortSignal,
  parentSignal?: AbortSignal,
): AbortSignal {
  if (parentSignal?.aborted) {
    return parentSignal
  } else if (childSignal.aborted) {
    return childSignal
  }

  const controller = new AbortController()
  parentSignal?.addEventListener("abort", () =>
    controller.abort(),
  )
  childSignal.addEventListener("abort", () =>
    controller.abort(),
  )
  return controller.signal
}

      `,
      command: "bun src/index.ts",
      result: "Got todos: [ ... ]"
    },
    withEffect: {
      fileName: "index.ts",
      code: `const makeTodos = Effect.gen(function*() {
  const client = (yield* HttpClient.HttpClient).pipe(
    HttpClient.filterStatusOk,
    HttpClient.mapRequest(HttpClientRequest.prependUrl("https://jsonplaceholder.typicode.com"))
  )

  // interuption and concurrency can be configured with
  // composition
  const list = (
    ids: Iterable<number>
  ): Effect.Effect<
    Array<unknown>,
    HttpClientError.HttpClientError | Cause.TimeoutException
  > =>
    Effect.forEach(ids, (id) => findById(id).pipe(Effect.retry({ times: 3 })), {
      concurrency: "inherit"
    })

  const findById = (
    id: number
  ): Effect.Effect<
    unknown,
    HttpClientError.HttpClientError | Cause.TimeoutException
  > =>
    client.get(\`/todos/\${id}\`).pipe(
      Effect.andThen((response) => response.json),
      Effect.timeout("1 second")
    )

  return { list, findById } as const
})

class Todos extends Effect.Tag("Todos")<Todos, Effect.Effect.Success<typeof makeTodos>>() {
  static Live = Layer.effect(Todos, makeTodos).pipe(
    Layer.provide(FetchHttpClient.layer)
  )
}

const main = Todos.list(Array.range(1, 10)).pipe(
  Effect.withConcurrency(3),
  Effect.timeout("10 seconds"),
  Effect.andThen((todos) => Console.log("Got todos", todos))
)`,
      command: "bun src/index.ts",
      result: "Got todos: [ ... ]"
    }
  }
]
