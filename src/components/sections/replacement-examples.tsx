'use client'

import * as Tabs from '@radix-ui/react-tabs'
import {Card} from '../layout/card'
import {Divider} from '../layout/divider'
import {Glow} from '../layout/glow'
import {Logo} from '../atoms/logo'
import {Code} from '../layout/code'

export const ReplacementExamples = () => {
  return (
    <section className="relative">
      <Glow direction="down" />
      <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-8 lg:px-16 pt-24">
        <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl text-white">NPM – the good parts</h2>
        <p className="mt-6 mb-16 max-w-lg">
          Lorem ipsum dolor sit amet consectetur. Nunc consequat quam id nunc. Sed varius turpis lacus ac justo neque aliquet. Nisl ullamcorper imperdiet
          libero nisi at venenatis velit.
        </p>
        <Card>
          <div className="flex flex-col items-center pt-16 pb-12">
            <h3 className="font-display text-2xl sm:text-3xl lg:text-4xl text-white">Library Replacements</h3>
            <p className="mt-6 mb-16">Effect provides a unified replacement for many one-off libraries.</p>
            <Tabs.Root defaultValue={examples[0].examples[0].name} className="w-full relative pl-52">
              <div className="absolute -top-32 -bottom-12 left-52 w-px -ml-px bg-gradient-to-b from-white/0 via-white/25 to-white/0" />
              <div className="absolute inset-y-0 left-0 pl-12 pt-14 ">
                <Tabs.List className="flex flex-col items-start gap-4 w-40 h-full overflow-y-auto">
                  {examples.map(({group, examples}, index) => (
                    <div key={index} className="w-full">
                      <h4 className="uppercase text-sm font-semibold text-white tracking-wider mb-1">{group}</h4>
                      <div className="flex flex-col items-start">
                        {examples.map(({name}, index) => (
                          <Tabs.Trigger
                            key={index}
                            value={name}
                            className="w-full text-left border-r border-transparent data-[state=active]:border-white data-[state=active]:text-white"
                          >
                            {name}
                          </Tabs.Trigger>
                        ))}
                      </div>
                    </div>
                  ))}
                </Tabs.List>
              </div>
              <div className="">
                {examples.map(({examples}, index) => (
                  <div key={index}>
                    {examples.map(({name, withoutEffect, withEffect}, index) => (
                      <Tabs.Content key={index} value={name} className="grow grid grid-cols-2 px-12 gap-6 data-[state=inactive]:absolute">
                        <div className="flex flex-col items-center gap-6">
                          <h4 className="font-display text-2xl text-white">Using {name}</h4>
                          <Code tabs={[{name: withoutEffect.fileName, content: withoutEffect.code}]} />
                        </div>
                        <div className="flex flex-col items-center gap-6">
                          <h4 className="font-display text-2xl text-white">
                            Using <span className="sr-only">Effect</span>
                            <Logo className="h-7 inline-block ml-1 -mt-1" />
                          </h4>
                          <Code tabs={[{name: withEffect.fileName, content: withEffect.code}]} />
                        </div>
                      </Tabs.Content>
                    ))}
                  </div>
                ))}
              </div>
            </Tabs.Root>
          </div>
        </Card>
      </div>
    </section>
  )
}

const examples = [
  {
    group: 'Schema',
    examples: [
      {
        name: 'zod',
        withoutEffect: {
          fileName: 'index.ts',
          code: `\
import { Effect } from "effect"

class HttpError {
  readonly _tag = "HttpError"
}

// Effect<never, HttpError, never>
const program = Effect.fail(new HttpError())

class HttpError {
  readonly _tag = "HttpError"
}

// Effect<never, HttpError, never>
const program = Effect.fail(new HttpError())

class HttpError {
  readonly _tag = "HttpError"
}

// Effect<never, HttpError, never>
const program = Effect.fail(new HttpError())\
      `
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
      `
        }
      },
      {
        name: 'yup',
        withoutEffect: {
          fileName: 'index.ts',
          code: `\
import { Effect } from "effect"

class HttpError {
  readonly _tag = "HttpError"
}

// Effect<never, HttpError, never>
const program = Effect.fail(new HttpError())\
      `
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
      `
        }
      },
      {
        name: 'superjson',
        withoutEffect: {
          fileName: 'index.ts',
          code: `\
import { Effect } from "effect"

class HttpError {
  readonly _tag = "HttpError"
}

// Effect<never, HttpError, never>
const program = Effect.fail(new HttpError())\
      `
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
      `
        }
      }
    ]
  },
  {
    group: 'Streaming',
    examples: [
      {
        name: 'rxjs',
        withoutEffect: {
          fileName: 'index.ts',
          code: `\
import { Effect } from "effect"

class HttpError {
  readonly _tag = "HttpError"
}

// Effect<never, HttpError, never>
const program = Effect.fail(new HttpError())\
      `
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
      `
        }
      }
    ]
  },
  {
    group: 'Control Flow',
    examples: [
      {
        name: 'p-queue',
        withoutEffect: {
          fileName: 'index.ts',
          code: `\
import { Effect } from "effect"

class HttpError {
  readonly _tag = "HttpError"
}

// Effect<never, HttpError, never>
const program = Effect.fail(new HttpError())\
      `
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
      `
        }
      },
      {
        name: 'ts-result',
        withoutEffect: {
          fileName: 'index.ts',
          code: `\
import { Effect } from "effect"

class HttpError {
  readonly _tag = "HttpError"
}

// Effect<never, HttpError, never>
const program = Effect.fail(new HttpError())\
      `
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
      `
        }
      }
    ]
  }
]
