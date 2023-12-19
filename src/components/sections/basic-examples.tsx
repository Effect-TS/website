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
                className="border-b whitespace-nowrap border-transparent data-[state=active]:border-white data-[state=active]:text-white pb-2"
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

await main()\
      `,
      command: "bun src/index.ts",
      result: "Hello, World!"
    },
    withEffect: {
      fileName: "index.ts",
      code: `\
import { Effect } from 'effect'

const main = Effect.sleep(1000).pipe(
  Effect.andThen(Console.log('Hello, World!'))
)

await Effect.runPromise(main)\
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
  never,
  CustomError, // type safety
  number
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


await Effect.runPromise(main)\
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
interface AbortablePromise<A> extends Promise<A> {
  readonly abort: () => void
}

// This function creates an AbortablePromise which
// will wait the specified number of milliseconds
// before resolving. The promise can be aborted
// using the \`.abort\` method.
const delay = (
  millis: number
): AbortablePromise<void> => {
  let timeout_id: NodeJS.Timeout
  let rejector: () => void
  const prom: any = new Promise((resolve, reject) => {
    rejector = reject
    timeout_id = setTimeout(() => {
      resolve()
    }, millis)
  })
  prom.abort = () => {
    clearTimeout( timeout_id )
    rejector()
  }
  return prom;
}

const interruptible = delay(2000)

interruptible
  .then(() => console.log('Did not interrupt'))
  .catch(() => console.log('Interrupted!'))

setTimeout(() => interruptible.abort(), 1000)\
      `,
      command: "bun src/index.ts",
      result: "Interrupted!"
    },
    withEffect: {
      fileName: "index.ts",
      code: `\
// Interruption is a first-class citizen in Effect
// and is built right into the Effect runtime
import { Effect, pipe } from 'effect'

const main = pipe(
  Effect.sleep(2000),
  // Let's log a message if \`Effect.sleep\` is
  // interrupted
  Effect.onInterrupt(() =>
    Effect.sync(() => console.log('Interrupted!'))
  ),
  // Interrupt the program after 1 second
  Effect.timeout(1000)
)

await Effect.runPromiseExit(program)\
      `,
      command: "bun src/index.ts",
      result: "Interrupted!"
    }
  },
  {
    name: "Retry",
    withoutEffect: {
      fileName: "index.ts",
      code: `\
// TODO
      `,
      command: "bun src/index.ts",
      result: "TODO"
    },
    withEffect: {
      fileName: "index.ts",
      code: `\
// TODO
      `,
      command: "bun src/index.ts",
      result: "TODO"
    }
  },
  {
    name: "Concurrency",
    withoutEffect: {
      fileName: "index.ts",
      code: `\
// TODO
      `,
      command: "bun src/index.ts",
      result: "TODO"
    },
    withEffect: {
      fileName: "index.ts",
      code: `\
// TODO
      `,
      command: "bun src/index.ts",
      result: "TODO"
    }
  },
  {
    // pipe, generators
    name: "Composition",
    withoutEffect: {
      fileName: "index.ts",
      code: `\
// TODO
      `,
      command: "bun src/index.ts",
      result: "TODO"
    },
    withEffect: {
      fileName: "index.ts",
      code: `\
// TODO
      `,
      command: "bun src/index.ts",
      result: "TODO"
    }
  }
]
