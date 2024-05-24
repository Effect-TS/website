"use client"

import * as Tabs from "@radix-ui/react-tabs"
import { Divider } from "../layout/divider"
import { Code } from "../layout/code"
import { Icon } from "../icons"

export const IntegrationExamples = () => {
  return (
    <div className="flex flex-col items-start md:items-center pt-8">
      <p className="mt-6 mb-6 md:mb-10 px-4">
        Effect integrates deeply with your current tech stack:
      </p>
      <Tabs.Root
        defaultValue={examples[0].name}
        className="w-full flex flex-col"
      >
        <div className="relative">
          <Tabs.List className="flex items-center overflow-x-auto justify-start md:justify-center px-4 gap-5 -mb-px hide-scrollbar">
            {examples.map(({ name, icon }, index) => (
              <Tabs.Trigger
                key={index}
                value={name}
                className="flex whitespace-nowrap items-center gap-1.5 border-b border-transparent data-[state=active]:border-white data-[state=active]:text-white pb-2"
              >
                {icon && (
                  <Icon name={icon as Icon.Name} className="h-4 shrink-0" />
                )}
                <span>{name}</span>
              </Tabs.Trigger>
            ))}
          </Tabs.List>
          <Divider />
          <div className="absolute inset-y-0 w-4 left-0 bg-gradient-to-r from-zinc-800 z-10" />
          <div className="absolute inset-y-0 w-4 right-0 bg-gradient-to-l from-zinc-900 z-10" />
        </div>
        {examples.map(({ name, tabs }, index) => (
          <Tabs.Content
            key={index}
            value={name}
            className="grow p-4 pt-8 md:p-12 data-[state=inactive]:absolute"
          >
            <Code
              tabs={tabs.map((tab) => ({
                name: tab.name,
                content: tab.code
              }))}
            />
          </Tabs.Content>
        ))}
      </Tabs.Root>
    </div>
  )
}

const examples = [
  {
    name: "Node.js",
    icon: "node",
    tabs: [
      {
        name: "index.ts",
        code: `\
import { Effect } from "effect"
 
class HttpError {
  readonly _tag = "HttpError"
}
 
// Effect<never, HttpError, never>
const program = Effect.fail(new HttpError())

class HttpError {
  readonly _tag = "HttpError"
}\
`
      },
      {
        name: "another-file.ts",
        code: `\
//another-file.ts
import { Effect } from "effect"
 
class HttpError {
  readonly _tag = "HttpError"
}
 
// Effect<never, HttpError, never>
const program = Effect.fail(new HttpError())

class HttpError {
  readonly _tag = "HttpError"
}\
`
      }
    ]
  },
  {
    name: "Bun",
    icon: "bun",
    tabs: [
      {
        name: "index.ts",
        code: `\
import { Effect } from "effect"
 
class HttpError {
  readonly _tag = "HttpError"
}
 
// Effect<never, HttpError, never>
const program = Effect.fail(new HttpError())

class HttpError {
  readonly _tag = "HttpError"
}\
`
      },
      {
        name: "another-file.ts",
        code: `\
//another-file.ts
import { Effect } from "effect"
 
class HttpError {
  readonly _tag = "HttpError"
}
 
// Effect<never, HttpError, never>
const program = Effect.fail(new HttpError())

class HttpError {
  readonly _tag = "HttpError"
}\
`
      }
    ]
  },
  {
    name: "Deno",
    icon: "deno",
    tabs: [
      {
        name: "index.ts",
        code: `\
import { Effect } from "effect"
 
class HttpError {
  readonly _tag = "HttpError"
}
 
// Effect<never, HttpError, never>
const program = Effect.fail(new HttpError())

class HttpError {
  readonly _tag = "HttpError"
}\
`
      },
      {
        name: "another-file.ts",
        code: `\
//another-file.ts
import { Effect } from "effect"
 
class HttpError {
  readonly _tag = "HttpError"
}
 
// Effect<never, HttpError, never>
const program = Effect.fail(new HttpError())

class HttpError {
  readonly _tag = "HttpError"
}\
`
      }
    ]
  },
  {
    name: "CF Workers",
    icon: "cloudflare",
    tabs: [
      {
        name: "index.ts",
        code: `\
import { Effect } from "effect"
 
class HttpError {
  readonly _tag = "HttpError"
}
 
// Effect<never, HttpError, never>
const program = Effect.fail(new HttpError())

class HttpError {
  readonly _tag = "HttpError"
}\
`
      },
      {
        name: "another-file.ts",
        code: `\
//another-file.ts
import { Effect } from "effect"
 
class HttpError {
  readonly _tag = "HttpError"
}
 
// Effect<never, HttpError, never>
const program = Effect.fail(new HttpError())

class HttpError {
  readonly _tag = "HttpError"
}\
`
      }
    ]
  },
  {
    name: "GraphQL",
    icon: "graphql",
    tabs: [
      {
        name: "index.ts",
        code: `\
import { Effect } from "effect"
 
class HttpError {
  readonly _tag = "HttpError"
}
 
// Effect<never, HttpError, never>
const program = Effect.fail(new HttpError())

class HttpError {
  readonly _tag = "HttpError"
}\
`
      },
      {
        name: "another-file.ts",
        code: `\
//another-file.ts
import { Effect } from "effect"
 
class HttpError {
  readonly _tag = "HttpError"
}
 
// Effect<never, HttpError, never>
const program = Effect.fail(new HttpError())

class HttpError {
  readonly _tag = "HttpError"
}\
`
      }
    ]
  },
  {
    name: "OpenAPI",
    icon: "open-api",
    tabs: [
      {
        name: "index.ts",
        code: `\
import { Effect } from "effect"
 
class HttpError {
  readonly _tag = "HttpError"
}
 
// Effect<never, HttpError, never>
const program = Effect.fail(new HttpError())

class HttpError {
  readonly _tag = "HttpError"
}\
`
      },
      {
        name: "another-file.ts",
        code: `\
//another-file.ts
import { Effect } from "effect"
 
class HttpError {
  readonly _tag = "HttpError"
}
 
// Effect<never, HttpError, never>
const program = Effect.fail(new HttpError())

class HttpError {
  readonly _tag = "HttpError"
}\
`
      }
    ]
  },
  {
    name: "React",
    icon: "react",
    tabs: [
      {
        name: "index.ts",
        code: `\
import { Effect } from "effect"
 
class HttpError {
  readonly _tag = "HttpError"
}
 
// Effect<never, HttpError, never>
const program = Effect.fail(new HttpError())

class HttpError {
  readonly _tag = "HttpError"
}\
`
      },
      {
        name: "another-file.ts",
        code: `\
//another-file.ts
import { Effect } from "effect"
 
class HttpError {
  readonly _tag = "HttpError"
}
 
// Effect<never, HttpError, never>
const program = Effect.fail(new HttpError())

class HttpError {
  readonly _tag = "HttpError"
}\
`
      }
    ]
  },
  {
    name: "Next.js",
    icon: "next",
    tabs: [
      {
        name: "index.ts",
        code: `\
import { Effect } from "effect"
 
class HttpError {
  readonly _tag = "HttpError"
}
 
// Effect<never, HttpError, never>
const program = Effect.fail(new HttpError())

class HttpError {
  readonly _tag = "HttpError"
}\
`
      },
      {
        name: "another-file.ts",
        code: `\
//another-file.ts
import { Effect } from "effect"
 
class HttpError {
  readonly _tag = "HttpError"
}
 
// Effect<never, HttpError, never>
const program = Effect.fail(new HttpError())

class HttpError {
  readonly _tag = "HttpError"
}\
`
      }
    ]
  },
  {
    name: "AWS CDK",
    icon: "amazon",
    tabs: [
      {
        name: "index.ts",
        code: `\
import { Effect } from "effect"
 
class HttpError {
  readonly _tag = "HttpError"
}
 
// Effect<never, HttpError, never>
const program = Effect.fail(new HttpError())

class HttpError {
  readonly _tag = "HttpError"
}\
`
      },
      {
        name: "another-file.ts",
        code: `\
//another-file.ts
import { Effect } from "effect"
 
class HttpError {
  readonly _tag = "HttpError"
}
 
// Effect<never, HttpError, never>
const program = Effect.fail(new HttpError())

class HttpError {
  readonly _tag = "HttpError"
}\
`
      }
    ]
  }
]
