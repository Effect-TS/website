'use client'

import * as Tabs from '@radix-ui/react-tabs'
import {Button} from '../atoms/button'
import {Checklist} from '../atoms/checklist'
import {Card} from '../layout/card'
import {Divider} from '../layout/divider'
import {Glow} from '../layout/glow'
import {Logo} from '../atoms/logo'
import {Code} from '../layout/code'

export const BasicExamples = () => {
  return (
    <section className="relative">
      <Glow direction="down" />
      <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-8 lg:px-16 pt-24">
        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl text-white">
          Let&apos;s see some <span className="text-transparent bg-clip-text bg-gradient-to-br from-[#5B9EE9] to-[#2F74C0]">example code</span>
        </h2>
        <p className="my-6 max-w-lg">
          Doing the right thing in TypeScript is hard. Effect makes it easy lorem ipsum dolor sit amet consectetur. Mattis et lacus tortor sed integer nunc
          mattis suspendisse diam.
        </p>
        <Checklist
          items={[
            'Effect helps you with handling errors, async code, concurrency, streams and much more.',
            'Effect provides a unified relacement for many one-off dependencies.',
            'Effect integrates deeply with your current tech stack.'
          ]}
        />
        <Button href="https://github.com/Effect-TS/examples" secondary className="mt-10 mb-16">
          See all examples on GitHub
        </Button>
        <Card>
          <div className="flex flex-col items-start md:items-center pt-8 md:pt-16">
            <h3 className="font-display text-2xl sm:text-3xl lg:text-4xl text-white px-4">Basic Examples</h3>
            <p className="mt-6 mb-6 md:mb-10 px-4 md:text-center">
              Effect helps you with handling errors, async code, concurrency, streams and much more.
            </p>
            <Tabs.Root defaultValue={examples[0].name} className="w-full flex flex-col">
              <Tabs.List className="flex relative z-10 items-center px-4 md:justify-center overflow-x-auto gap-4 -mb-px">
                {examples.map(({name}, index) => (
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
              {examples.map(({name, withoutEffect, withEffect}, index) => (
                <Tabs.Content
                  key={index}
                  value={name}
                  className="grow p-4 pt-8 md:p-12 grid grid-cols-1 gap-y-10 md:grid-cols-2 gap-6 data-[state=inactive]:absolute"
                >
                  <div className="flex flex-col items-center gap-6">
                    <h4 className="font-display text-2xl text-white">Without Effect</h4>
                    <Code
                      tabs={[{name: withoutEffect.fileName, content: withoutEffect.code}]}
                      terminal={{run: 'Run snippet', command: withoutEffect.command, result: withoutEffect.result}}
                    />
                  </div>
                  <div className="flex flex-col items-center gap-6">
                    <h4 className="font-display text-2xl text-white">
                      With <span className="sr-only">Effect</span>
                      <Logo className="h-7 inline-block ml-1 -mt-1" />
                    </h4>
                    <Code
                      tabs={[{name: withEffect.fileName, content: withEffect.code}]}
                      terminal={{run: 'Run snippet', command: withEffect.command, result: withEffect.result}}
                    />
                  </div>
                </Tabs.Content>
              ))}
            </Tabs.Root>
          </div>
        </Card>
      </div>
    </section>
  )
}

function randomElement<A>(array: Array<A>): A {
  return array[Math.floor(Math.random() * array.length)]
}

const examples = [
  {
    name: 'Sync code',
    withoutEffect: {
      fileName: 'index.ts',
      code: `\
const main = () => {
  console.log('Hello, World!')
}

main()\
      `,
      command: 'bun src/index.ts',
      result: 'Hello, World!'
    },
    withEffect: {
      fileName: 'index.ts',
      code: `\
import { Effect } from 'effect'

const main = Effect.sync(() =>
  console.log('Hello, World!')
)

Effect.runSync(main)\
      `,
      command: 'bun src/index.ts',
      result: 'Hello, World!'
    }
  },
  {
    name: 'Async code',
    withoutEffect: {
      fileName: 'index.ts',
      code: `\
const sleep = (ms: number) =>
  new Promise((resolve) =>
    setTimeout(() => {
      resolve()
    }, ms)
  )

const main = async () => {
  await sleep(1000)
  console.log('Hello, World!')
}

await main()\
      `,
      command: 'bun src/index.ts',
      result: 'Hello, World!'
    },
    withEffect: {
      fileName: 'index.ts',
      code: `\
import { Effect } from 'effect'

const main = Effect.gen(function* (_) {
  yield* _(Effect.sleep(1000))
  console.log('Hello, World!')
})

await Effect.runPromise(program)\
      `,
      command: 'bun src/index.ts',
      result: 'Hello, World!'
    }
  },
  {
    name: 'Error Handling',
    withoutEffect: {
      fileName: 'index.ts',
      code: `\
// What if we have some errors that should
// be fatal and some that should be non-fatal?
type PossibleErrors = NonFatalError | FatalError

class NonFatalError {
  readonly _tag = 'NonFatalError'
}

class FatalError {
  readonly _tag = 'FatalError'
}

const maybeFail = (error: PossibleErrors) => {
  if (Math.random() > 0.5) {
    throw error
  }
}

// We have to be very careful to handle each
// non-fatal error properly as well as to
// propagate fatal errors
const main = () => {
  try {
    maybeFail(new NonFatalError())
    try {
      maybeFail(new FatalError())
    } catch (error) {
      console.log('Fatal error encountered!')
      throw error
    }
  } catch (error) {
    if (error._tag === 'NonFatalError') {
      console.log('Handling non-fatal error...')
    } else {
      throw error
    }
  }
}

main()\
      `,
      command: 'bun src/index.ts',
      result: randomElement(['Handling non-fatal error...', 'Fatal error encountered!\n...'])
    },
    withEffect: {
      fileName: 'index.ts',
      code: `\
// With Effect you have full control over how
// errors are handled and propagated through
// your program
import { Effect, pipe } from 'effect'

type PossibleErrors = NonFatalError | FatalError

class NonFatalError {
  readonly _tag = 'NonFatalError'
}

class FatalError {
  readonly _tag = 'FatalError'
}

const maybeFail = (error: PossibleErrors) =>
  Math.random() > 0.5
    ? Effect.fail(error)
    : Effect.unit

const main = pipe(
  maybeFail(new NonFatalError()),
  Effect.flatMap(() => maybeFail(new FatalError())),
  Effect.catchTags({
    NonFatalError: (error) => Effect.sync(() => {
      console.log('Handling non-fatal error...')
    }),
    // Here we use \`Effect.die\` to elevate
    // a FatalError to a failure that our
    // program cannot handle
    FatalError: (error) => Effect.sync(() => {
      console.log('Fatal error encountered!')
    }).pipe(Effect.flatMap(() => Effect.die(error))
  })
)

await Effect.runPromise(main)\
      `,
      command: 'bun src/index.ts',
      result: 'Error “HttpError” gracefully handled. Yay!'
    }
  },
  {
    name: 'Interruption',
    withoutEffect: {
      fileName: 'index.ts',
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
      command: 'bun src/index.ts',
      result: 'Interrupted!'
    },
    withEffect: {
      fileName: 'index.ts',
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
      command: 'bun src/index.ts',
      result: 'Interrupted!'
    }
  },
  {
    name: 'Retry',
    withoutEffect: {
      fileName: 'index.ts',
      code: `\
// TODO
      `,
      command: 'bun src/index.ts',
      result: 'TODO'
    },
    withEffect: {
      fileName: 'index.ts',
      code: `\
// TODO
      `,
      command: 'bun src/index.ts',
      result: 'TODO'
    }
  },
  {
    name: 'Concurrency',
    withoutEffect: {
      fileName: 'index.ts',
      code: `\
// TODO
      `,
      command: 'bun src/index.ts',
      result: 'TODO'
    },
    withEffect: {
      fileName: 'index.ts',
      code: `\
// TODO
      `,
      command: 'bun src/index.ts',
      result: 'TODO'
    }
  },
  {
    // pipe, generators
    name: 'Composition',
    withoutEffect: {
      fileName: 'index.ts',
      code: `\
// TODO
      `,
      command: 'bun src/index.ts',
      result: 'TODO'
    },
    withEffect: {
      fileName: 'index.ts',
      code: `\
// TODO
      `,
      command: 'bun src/index.ts',
      result: 'TODO'
    }
  },
]
