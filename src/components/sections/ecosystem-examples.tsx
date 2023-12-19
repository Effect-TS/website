"use client"

import * as Tabs from "@radix-ui/react-tabs"
import { Divider } from "../layout/divider"
import { Logo } from "../atoms/logo"
import { Code } from "../layout/code"

export const EcosystemExamples = () => {
  return (
    <div className="flex flex-col items-start md:items-center pt-8 pb-4 md:pb-12">
      <p className="mt-6 mb-6 md:mb-16 px-4 md:text-center ">
        Effect provides a unified replacement for many one-off libraries.
      </p>
      <Tabs.Root
        defaultValue={examples[0].examples[0].name}
        className="w-full relative md:pl-52"
      >
        <div className="hidden md:block absolute -top-32 -bottom-12 left-52 w-px -ml-px bg-gradient-to-b from-white/0 via-white/25 to-white/0" />
        <div className="hidden md:block absolute inset-y-0 left-0 pl-12 pt-14 ">
          <Tabs.List className="flex flex-col items-start gap-4 w-40 h-full overflow-y-auto">
            {examples.map(({ group, examples }, index) => (
              <div key={index} className="w-full">
                <h4 className="uppercase text-sm font-semibold text-white tracking-wider mb-1">
                  {group}
                </h4>
                <div className="flex flex-col items-start">
                  {examples.map(({ name }, index) => (
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
        <div className="md:hidden relative">
          <Tabs.List className="flex relative z-10 items-center px-4 md:justify-center overflow-x-auto gap-4 -mb-px hide-scrollbar">
            {examples.map(({ examples }) =>
              examples.map(({ name }, index) => (
                <Tabs.Trigger
                  key={index}
                  value={name}
                  className="border-b whitespace-nowrap border-transparent data-[state=active]:border-white data-[state=active]:text-white pb-2"
                >
                  {name}
                </Tabs.Trigger>
              ))
            )}
          </Tabs.List>
          <Divider />
          <div className="absolute inset-y-0 w-4 left-0 bg-gradient-to-r from-zinc-800 z-10" />
          <div className="absolute inset-y-0 w-4 right-0 bg-gradient-to-l from-zinc-900 z-10" />
        </div>
        <div className="pt-8 md:pt-0">
          {examples.map(({ examples }, index) => (
            <div key={index}>
              {examples.map(({ name, withoutEffect, withEffect }, index) => (
                <Tabs.Content
                  key={index}
                  value={name}
                  className="grow grid grid-cols-1 md:grid-cols-2 px-4 md:px-12 gap-y-10 gap-6 data-[state=inactive]:absolute"
                >
                  <div className="flex flex-col items-center gap-6">
                    <h4 className="font-display text-2xl text-white">
                      Using {name}
                    </h4>
                    <Code
                      tabs={[
                        {
                          name: withoutEffect.fileName,
                          content: withoutEffect.code
                        }
                      ]}
                    />
                  </div>
                  <div className="flex flex-col items-center gap-6">
                    <h4 className="font-display text-2xl text-white">
                      Using <span className="sr-only">Effect</span>
                      <Logo className="h-7 inline-block ml-1 -mt-1" />
                    </h4>
                    <Code
                      tabs={[
                        {
                          name: withEffect.fileName,
                          content: withEffect.code
                        }
                      ]}
                    />
                  </div>
                </Tabs.Content>
              ))}
            </div>
          ))}
        </div>
      </Tabs.Root>
    </div>
  )
}

const examples = [
  {
    group: "Schema",
    examples: [
      {
        name: "zod",
        withoutEffect: {
          fileName: "index.ts",
          code: `import { z } from "zod"

const User = z.object({
  username: z.string()
})

User.parse({ username: "john_doe" })

// extract the inferred type
type User = z.infer<typeof User>`
        },
        withEffect: {
          fileName: "index.ts",
          code: `import * as S from "@effect/schema/Schema"

const User = S.struct({
  username: S.string
})

S.parse(User)({ username: "john_doe" })

// extract the inferred type
type User = S.Schema.To<typeof User>`
        }
      },
      {
        name: "yup",
        withoutEffect: {
          fileName: "index.ts",
          code: `import * as yup from "yup"

const User = yup.object({
  username: yup.string().required()
})

User.validate({ username: "john_doe" })

// extract the inferred type
type User = yup.InferType<typeof User>`
        },
        withEffect: {
          fileName: "index.ts",
          code: `import * as S from "@effect/schema/Schema"

const User = S.struct({
  username: S.string
})

S.parse(User)({ username: "john_doe" })

// extract the inferred type
type User = S.Schema.To<typeof User>`
        }
      },
      {
        name: "superjson",
        withoutEffect: {
          fileName: "index.ts",
          code: `import superjson from "superjson"

// encoding
const jsonString = superjson.stringify({ date: new Date(0) })
// '{"json":{"date":"1970-01-01T00:00:00.000Z"},"meta":{"values":{date:"Date"}}}'

// decoding
const object = superjson.parse<{ date: Date }>(jsonString)`
        },
        withEffect: {
          fileName: "index.ts",
          code: `import * as S from "@effect/schema/Schema"

const schema = S.ParseJson.pipe(
  S.compose(
    S.struct({
      date: S.Date
    })
  )
)

// encoding
const jsonString = S.encodeSync(schema)({ date: new Date(0) })
// '{"date":"1970-01-01T00:00:00.000Z"}'

// decoding
const object = S.decodeSync(schema)(jsonString)`
        }
      }
    ]
  },
  {
    group: "Streaming",
    examples: [
      {
        name: "rxjs",
        withoutEffect: {
          fileName: "index.ts",
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
          fileName: "index.ts",
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
    group: "Control Flow",
    examples: [
      {
        name: "p-queue",
        withoutEffect: {
          fileName: "index.ts",
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
          fileName: "index.ts",
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
        name: "ts-results",
        withoutEffect: {
          fileName: "index.ts",
          code: `import { existsSync, readFileSync } from "fs"
import { Ok, Err, Result } from "ts-results"

function readFile(path: string): Result<string, "invalid path"> {
  if (existsSync(path)) {
    return new Ok(readFileSync(path, "utf8"))
  } else {
    return new Err("invalid path")
  }
}
`
        },
        withEffect: {
          fileName: "index.ts",
          code: `import { existsSync, readFileSync } from "fs"
import { Effect } from "effect"

function readFile(path: string): Effect.Effect<never, "invalid path", string> {
  if (existsSync(path)) {
    return Effect.succeed(readFileSync(path, "utf8"))
  } else {
    return Effect.fail("invalid path")
  }
}
`
        }
      }
    ]
  }
]
