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
          <div className="flex flex-col items-center pt-16">
            <h3 className="font-display text-2xl sm:text-3xl lg:text-4xl text-white">Basic Examples</h3>
            <p className="mt-6 mb-10">Effect helps you with handling errors, async code, concurrency, streams and much more.</p>
            <Tabs.Root defaultValue={examples[0].name} className="w-full flex flex-col">
              <Tabs.List className="flex items-center justify-center gap-4 -mb-px">
                {examples.map(({name}, index) => (
                  <Tabs.Trigger
                    key={index}
                    value={name}
                    className="border-b border-transparent data-[state=active]:border-white data-[state=active]:text-white pb-2"
                  >
                    {name}
                  </Tabs.Trigger>
                ))}
              </Tabs.List>
              <Divider />
              {examples.map(({name, withoutEffect, withEffect}, index) => (
                <Tabs.Content key={index} value={name} className="grow p-12 grid grid-cols-2 gap-6 data-[state=inactive]:absolute">
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

const examples = [
  {
    name: 'Sync code',
    withoutEffect: {
      fileName: 'index.ts',
      code: `\
import { Effect } from "effect"

class HttpError {
  readonly _tag = "HttpError"
}

// Effect<never, HttpError, never>
const program = Effect.fail(new HttpError())\
      `,
      command: 'bun src/index.ts',
      result: 'Error “HttpError” gracefully handled. Yay!'
    },
    withEffect: {
      fileName: 'index.ts',
      code: `\
import { Effect } from "effect"

class HttpError {
  readonly _tag = "HttpError"
}

// Effect<never, HttpError, never>
const program = Effect.fail(new HttpError())\
      `,
      command: 'bun src/index.ts',
      result: 'Error “HttpError” gracefully handled. Yay!'
    }
  },
  {
    name: 'Async code',
    withoutEffect: {
      fileName: 'index.ts',
      code: `\
import { Effect } from "effect"

class HttpError {
  readonly _tag = "HttpError"
}

// Effect<never, HttpError, never>
const program = Effect.fail(new HttpError())\
      `,
      command: 'bun src/index.ts',
      result: 'Error “HttpError” gracefully handled. Yay!'
    },
    withEffect: {
      fileName: 'index.ts',
      code: `\
import { Effect } from "effect"

class HttpError {
  readonly _tag = "HttpError"
}

// Effect<never, HttpError, never>
const program = Effect.fail(new HttpError())\
      `,
      command: 'bun src/index.ts',
      result: 'Error “HttpError” gracefully handled. Yay!'
    }
  },
  {
    name: 'Error Handling',
    withoutEffect: {
      fileName: 'index.ts',
      code: `\
import { Effect } from "effect"

class HttpError {
  readonly _tag = "HttpError"
}

// Effect<never, HttpError, never>
const program = Effect.fail(new HttpError())\
      `,
      command: 'bun src/index.ts',
      result: 'Error “HttpError” gracefully handled. Yay!'
    },
    withEffect: {
      fileName: 'index.ts',
      code: `\
import { Effect } from "effect"

class HttpError {
  readonly _tag = "HttpError"
}

// Effect<never, HttpError, never>
const program = Effect.fail(new HttpError())\
      `,
      command: 'bun src/index.ts',
      result: 'Error “HttpError” gracefully handled. Yay!'
    }
  },
  {
    name: 'Cancelation',
    withoutEffect: {
      fileName: 'index.ts',
      code: `\
import { Effect } from "effect"

class HttpError {
  readonly _tag = "HttpError"
}

// Effect<never, HttpError, never>
const program = Effect.fail(new HttpError())\
      `,
      command: 'bun src/index.ts',
      result: 'Error “HttpError” gracefully handled. Yay!'
    },
    withEffect: {
      fileName: 'index.ts',
      code: `\
import { Effect } from "effect"

class HttpError {
  readonly _tag = "HttpError"
}

// Effect<never, HttpError, never>
const program = Effect.fail(new HttpError())\
      `,
      command: 'bun src/index.ts',
      result: 'Error “HttpError” gracefully handled. Yay!'
    }
  }
]
