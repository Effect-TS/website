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
                      fixedHeight={400}
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
                      fixedHeight={400}
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
          code: `import { Schema as S } from "@effect/schema"

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
          code: `import { Schema as S } from "@effect/schema"

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
          code: `import { Schema as S } from "@effect/schema"

const schema = S.parseJson(S.struct({ date: S.Date }))

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
import { interval, firstValueFrom } from "rxjs"
import { take, map, toArray } from "rxjs/operators"

const counts$ = interval(1000).pipe(
  take(5),
  map((x) => x * 2),
  toArray(),
)

firstValueFrom(counts$).then((x) => console.log(x))\
      `
        },
        withEffect: {
          fileName: "index.ts",
          code: `\
import { Effect, Schedule, Stream } from "effect"

const counts = Stream.fromSchedule(Schedule.spaced(1000)).pipe(
  Stream.take(5),
  Stream.map((x) => x * 2),
  Stream.runCollect,
)

Effect.runPromise(counts).then((x) => console.log(x))\
      `
        }
      }
    ]
  },
  {
    group: "Control Flow",
    examples: [
      {
        name: "p-*",
        withoutEffect: {
          fileName: "index.ts",
          code: `\
import pMap from "p-map";
import pQueue from "p-queue";
import pRetry from "p-retry";

async function main() {
  const queue = new pQueue({ concurrency: 10 });
  const signal = AbortSignal.timeout(1000);
  const todos = await pMap(
    Array.from({ length: 100 }, (_, i) => i + 1),
    (id) =>
      queue.add(({ signal }) => fetchTodo(id, signal), {
        signal,
      })
  );
  console.log(todos);
}

main().catch(console.error);

//

const fetchTodo = (
  id: number,
  signal?: AbortSignal
): Promise<unknown> =>
  pRetry(
    async () => {
      const res = await fetch(
        \`https://jsonplaceholder.typicode.com/todos/\${id}\`,
        { signal }
      );
      if (!res.ok) throw new Error(res.statusText);
      return res.json();
    },
    { retries: 3 }
  );\
      `
        },
        withEffect: {
          fileName: "index.ts",
          code: `\
import { Effect } from "effect";
import * as Http from "@effect/platform-node/HttpClient";

Effect.gen(function* () {
  const semaphore = yield* Effect.makeSemaphore(10);
  const todos = yield* Effect.forEach(
    Array.from({ length: 100 }, (_, i) => i + 1),
    (id) => semaphore.withPermits(1)(fetchTodo(id)),
    { concurrency: "unbounded" }
  );
  console.log(todos);
}).pipe(Effect.timeout(1000), Effect.runPromise);

const fetchTodo = (
  id: number
): Effect.Effect<unknown, Http.error.HttpClientError> =>
  Http.request
    .get(\`https://jsonplaceholder.typicode.com/todos/\${id}\`)
    .pipe(
      Http.client.fetchOk,
      Http.response.json,
      Effect.retry(
        Schedule.exponential(1000).pipe(Schedule.compose(Schedule.recurs(3))
      )
    );\
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

function readFile(path: string): Effect.Effect<string, "invalid path"> {
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
  },
  {
    group: "HTTP",
    examples: [
      {
        name: "fetch",
        withoutEffect: {
          fileName: "index.ts",
          code: `const fetchTodo = async (
  id: number,
  signal?: AbortSignal
): Promise<unknown> => {
  const res = await fetch(
    \`https://jsonplaceholder.typicode.com/todos/\${id}\`,
    { signal }
  );
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
};`
        },
        withEffect: {
          fileName: "index.ts",
          code: `import * as Http from "@effect/platform-node/HttpClient";
import { Effect } from "effect";

const fetchTodo = (
  id: number
): Effect.Effect<
  unknown,
  Http.error.HttpClientError
> =>
  Http.request
    .get(\`https://jsonplaceholder.typicode.com/todos/\${id}\`)
    .pipe(
      Http.client.fetchOk,
      Http.response.json,
    );`
        }
      },
      {
        name: "express",
        withoutEffect: {
          fileName: "index.ts",
          code: `import Express from "express";

const app = Express();

app.get("/", (_req, res) => {
  res.json({ message: "Hello World" });
});

app.listen(3000);`
        },
        withEffect: {
          fileName: "index.ts",
          code: `import { HttpServer as Http, runMain } from "@effect/platform";
import { NodeHttpServer } from "@effect/platform-node";
import { Layer } from "effect";
import { createServer } from "node:http";

const app = Http.router.empty.pipe(
  Http.router.get(
    "/",
    Http.response.json({ message: "Hello World" })
  )
);

const HttpLive = Http.server
  .serve(app)
  .pipe(
    Layer.provide(
      NodeHttpServer.server.layer(() => createServer(), {
        port: 3000,
      })
    )
  );

runMain(Layer.launch(HttpLive));`
        }
      }
    ]
  }
]
