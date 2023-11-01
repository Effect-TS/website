'use client'

import * as Tabs from '@radix-ui/react-tabs'
import {Button} from '../atoms/button'
import {Checklist} from '../atoms/checklist'
import {Card} from '../layout/card'
import {Divider} from '../layout/divider'
import {Glow} from '../layout/glow'
import {Logo} from '../atoms/logo'
import {Code} from '../layout/code'
import {Icon, IconName} from '../icons'

export const IntegrationExamples = () => {
  return (
    <section className="relative">
      <Glow direction="down" />
      <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-8 lg:px-16 pt-24">
        <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl text-white">Integrates with your stack</h2>
        <p className="mt-6 mb-16 max-w-lg">
          Lorem ipsum dolor sit amet consectetur. Nunc consequat quam id nunc. Sed varius turpis lacus ac justo neque aliquet. Nisl ullamcorper imperdiet
          libero nisi at venenatis velit.
        </p>
        <Card>
          <div className="flex flex-col items-center pt-16">
            <h3 className="font-display text-2xl sm:text-3xl lg:text-4xl text-white">Integrations</h3>
            <p className="mt-6 mb-10">Effect integrates deeply with your current tech stack:</p>
            <Tabs.Root defaultValue={examples[0].name} className="w-full flex flex-col">
              <Tabs.List className="flex items-center justify-center gap-5 -mb-px">
                {examples.map(({name, icon}, index) => (
                  <Tabs.Trigger
                    key={index}
                    value={name}
                    className="flex items-center gap-1.5 border-b border-transparent data-[state=active]:border-white data-[state=active]:text-white pb-2"
                  >
                    {icon && <Icon name={icon as IconName} className="h-4" />}
                    <span>{name}</span>
                  </Tabs.Trigger>
                ))}
              </Tabs.List>
              <Divider />
              {examples.map(({name, tabs}, index) => (
                <Tabs.Content key={index} value={name} className="grow p-12 data-[state=inactive]:absolute">
                  <Code tabs={tabs.map((tab) => ({name: tab.name, content: tab.code}))} />
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
    name: 'Node.js',
    icon: 'node',
    tabs: [
      {
        name: 'index.ts',
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
        name: 'another-file.ts',
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
    name: 'Bun',
    icon: 'bun',
    tabs: [
      {
        name: 'index.ts',
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
        name: 'another-file.ts',
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
    name: 'Deno',
    icon: 'deno',
    tabs: [
      {
        name: 'index.ts',
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
        name: 'another-file.ts',
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
    name: 'CF Workers',
    icon: 'cloudflare',
    tabs: [
      {
        name: 'index.ts',
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
        name: 'another-file.ts',
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
    name: 'GraphQL',
    icon: 'graphql',
    tabs: [
      {
        name: 'index.ts',
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
        name: 'another-file.ts',
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
    name: 'OpenAPI',
    icon: 'open-api',
    tabs: [
      {
        name: 'index.ts',
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
        name: 'another-file.ts',
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
    name: 'React',
    icon: 'react',
    tabs: [
      {
        name: 'index.ts',
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
        name: 'another-file.ts',
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
    name: 'Next.js',
    icon: 'next',
    tabs: [
      {
        name: 'index.ts',
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
        name: 'another-file.ts',
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
    name: 'AWS CDK',
    icon: 'amazon',
    tabs: [
      {
        name: 'index.ts',
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
        name: 'another-file.ts',
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
