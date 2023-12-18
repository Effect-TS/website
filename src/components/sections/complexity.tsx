'use client'

import {useState} from 'react'
import {Icon} from '../icons'
import {motion} from 'framer-motion'
import {Code} from '../layout/code'
import {Logo} from '../atoms/logo'

export const Complexity = () => {
  const [currentIndex, setCurrentIndex] = useState<number>(0)

  return (
    <section className="relative">
      <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-8 lg:px-16 pt-24">
        <h2 className="font-display mb-6 text-2xl sm:text-3xl lg:text-4xl text-white text-center">{content.heading}</h2>
        <p className="mb-16 text-center max-w-xl mx-auto">{content.text}</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-y-12 gap-x-10 items-end">
          <div className="relative text-sm max-w-lg">
            <svg viewBox="0 0 577 211" className="w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="0.5" y="187" width="576" height="1" fill="url(#paint0_linear_280_1304)" />
              <motion.line
                animate={{pathLength: (1 / content.features.length) * (currentIndex + 1)}}
                x1="0.458313"
                y1="186.502"
                x2="502.458"
                y2="144.502"
                stroke="url(#paint1_linear_280_1304)"
              />
              <motion.path
                animate={{pathLength: (1 / content.features.length) * (currentIndex + 1) * (currentIndex === content.features.length - 1 ? 1 : 0.93)}}
                d="M2.5 187C150.455 169.787 424 116 502.5 1"
                stroke="url(#paint2_linear_280_1304)"
              />
              <defs>
                <linearGradient id="paint0_linear_280_1304" x1="0.499992" y1="187.954" x2="576.5" y2="187.81" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#18181B" />
                  <stop offset="0.177083" stopColor="#71717A" />
                  <stop offset="1" stopColor="#09090B" />
                </linearGradient>
                <linearGradient id="paint1_linear_280_1304" x1="0.5" y1="187" x2="502.5" y2="145" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#3178C6" stopOpacity="0.25" />
                  <stop offset="0.515625" stopColor="#3178C6" />
                  <stop offset="1" stopColor="#3178C6" />
                </linearGradient>
                <linearGradient id="paint2_linear_280_1304" x1="502.5" y1="0.99997" x2="2.5" y2="187" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#F97583" />
                  <stop offset="0.489583" stopColor="#F97583" />
                  <stop offset="1" stopColor="#F97583" stopOpacity="0.25" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute left-0 top-0">
              <span className="flex items-center gap-1">
                <span>Complexity</span>
                <Icon name="arrow-up-right-light" className="h-3" />
              </span>
              <span>(Lower is better)</span>
              <span className="flex gap-1.5 items-center mt-2">
                <span className="text-red-400">–</span>
                <span>Without Effect</span>
              </span>
              <span className="flex gap-1.5 items-center">
                <span className="text-blue-400">–</span>
                <span>With Effect</span>
              </span>
            </div>
            <div className="absolute right-0 bottom-0 flex items-center gap-1">
              <span>Features</span>
              <Icon name="arrow-right" className="h-3" />
            </div>
          </div>
          <div className="lg:pr-16">
            <ul>
              {content.features.map(({name, description, color}, index) => (
                <li key={index}>
                  {index > 0 && <div className="h-3 w-px ml-[9px] bg-zinc-700" />}
                  <button onClick={() => setCurrentIndex(index)} className="text-white flex gap-4 items-center text-left relative">
                    {currentIndex >= index && (
                      <>
                        <div className="absolute -left-2 w-9 h-9 rounded-xl" style={{backgroundColor: color}} />
                        <div className="absolute -left-2 w-9 h-9 rounded-xl border border-white/10" />
                      </>
                    )}
                    <div className="relative bg-gradient-to-br from-zinc-100 to-zinc-500 h-5 w-5 rounded-md p-px">
                      <div className={`rounded-[5px] h-full w-full flex items-center justify-center ${currentIndex >= index ? 'bg-white' : 'bg-black'}`}>
                        <Icon name="check" className="ml-px h-3.5 text-black" />
                      </div>
                    </div>
                    <div>
                      <div>{name}</div>
                      <div className="text-xs text-zinc-400">{description}</div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="grid lg:grid-cols-2 gap-y-12 gap-x-6 pt-12">
          <div className="flex flex-col items-center gap-6">
            <h4 className="font-display text-2xl text-white">Without Effect</h4>
            <Code
              tabs={[
                {
                  name: content.features[currentIndex].withoutEffect.fileName,
                  content: content.features[currentIndex].withoutEffect.code,
                  highlights: content.features[currentIndex].withoutEffect.highlights
                }
              ]}
              fixedHeight={410}
            />
          </div>
          <div className="flex flex-col items-center gap-6">
            <h4 className="font-display text-2xl text-white">
              With <span className="sr-only">Effect</span>
              <Logo className="h-7 inline-block ml-1 -mt-1" />
            </h4>
            <Code
              tabs={[
                {
                  name: content.features[currentIndex].withEffect.fileName,
                  content: content.features[currentIndex].withEffect.code,
                  highlights: content.features[currentIndex].withEffect.highlights
                }
              ]}
              fixedHeight={410}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

const content = {
  heading: 'Keep your code simple at high complexity',
  text: `Lorem ipsum dolor sit amet consectetur. Egestas maecenas sed egestas eget arcu parturient purus bibendum viverra.`,
  features: [
    {
      name: 'Error Handling',
      description: 'Lorem ipsum dolor sit amet consectetur egestas maecenas sed.',
      color: '#283413',
      withoutEffect: {
        fileName: 'index.ts',
        code: `\
async function getTodo(
  id: number,
): Promise<
  | { ok: true; todo: any }
  | { ok: false; error: "InvalidJson" | "RequestFailed" }
> {
  try {
    const response = await fetch(\`/todos/\${id}\`)
    if (!response.ok) throw new Error("Not OK!")
    try {
      const todo = await response.json()
      return { ok: true, todo }
    } catch (jsonError) {
      return { ok: false, error: "InvalidJson" }
    }
  } catch (error) {
    return { ok: false, error: "RequestFailed" }
  }
}\
      `,
        highlights: [
          {
            color: '#283413',
            lines: [4, 5, 9, 10, 12, 13, 14, 15, 16, 17]
          },
        ]
      },
      withEffect: {
        fileName: 'index.ts',
        code: `\
const getTodo = (
  id: number
): Effect.Effect<never, HttpClientError, unknown> =>
  Http.request.get(\`/todos/\${id}\`).pipe(
    Http.client.fetchOk(),
    Effect.flatMap((response) => response.json),
  )\
      `,
        highlights: [
          {
            color: '#283413',
            lines: [3]
          },
        ]
      }
    },
    {
      name: 'Retry',
      description: 'Lorem ipsum dolor sit amet consectetur egestas maecenas sed.',
      color: '#39300D',
      withoutEffect: {
        fileName: 'index.ts',
        code: `\
async function getTodo(
  id: number,
  retries = 3,
): Promise<
  | { ok: true; todo: any }
  | { ok: false; error: "InvalidJson" | "RequestFailed" }
> {
  try {
    const response = await fetch(\`/todos/\${id}\`)
    if (!response.ok) throw new Error("Not OK!")
    try {
      const todo = await response.json()
      return { ok: true, todo }
    } catch (jsonError) {
      if (retries > 0) {
        return getTodo(id, retries - 1)
      }
      return { ok: false, error: "InvalidJson" }
    }
  } catch (error) {
    if (retries > 0) {
      return getTodo(retries - 1)
    }
    return { ok: false, error: "RequestFailed" }
  }
}\
      `,
        highlights: [
          {
            color: '#283413',
            lines: [3, 15, 16, 17, 21, 22, 23]
          },
        ]
      },
      withEffect: {
        fileName: 'index.ts',
        code: `\
const getTodo = (
  id: number
): Effect.Effect<never, HttpClientError, unknown> =>
  Http.request.get(\`/todos/\${id}\`).pipe(
    Http.client.fetchOk(),
    Effect.flatMap((response) => response.json),
    Effect.retryN(3),
  )\
      `,
        highlights: [
          {
            color: '#283413',
            lines: [7]
          },
        ]
      }
    },
    {
      name: 'Interruption',
      description: 'Lorem ipsum dolor sit amet consectetur egestas maecenas sed.',
      color: '#28233B',
      withoutEffect: {
        fileName: 'index.ts',
        code: `\
async function getTodo(
  id: number,
  {
    retries = 3,
    signal,
  }: {
    retries?: number
    signal?: AbortSignal
  },
): Promise<
  | { ok: true; todo: any }
  | {
      ok: false
      error: "InvalidJson" | "RequestFailed" | "Timeout"
    }
> {
  try {
    const controller = new AbortController()
    setTimeout(() => controller.abort(), 1000)
    signal?.addEventListener(
      "abort",
      () => controller.abort()
    )
    const response = await fetch(\`/todos/\${id}\`, {
      signal: controller.signal,
    })
    if (!response.ok) throw new Error("Not OK!")
    try {
      const todo = await response.json()
      return { ok: true, todo }
    } catch (jsonError) {
      if (retries > 0) {
        return getTodo(id, {
          retries: retries - 1,
          signal
        })
      }
      return { ok: false, error: "InvalidJson" }
    }
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      return { ok: false, error: "Timeout" }
    } else if (retries > 0) {
      return getTodo(id, {
        retries: retries - 1,
        signal
      })
    }
    return { ok: false, error: "RequestFailed" }
  }
}
      `,
        highlights: [
          {
            color: '#283413',
            lines: [5, 8, 14, 18, 19, 20, 21, 22, 23, 35, 41, 42, 46]
          },
        ]
      },
      withEffect: {
        fileName: 'index.ts',
        code: `\
class Timeout extends Data.TaggedError("Timeout") {}

const getTodo = (
  id: number,
): Effect.Effect<
  never,
  HttpClientError | Timeout,
  unknown
> =>
  Http.request.get(\`/todos/\${id}\`).pipe(
    Http.client.fetchOk(),
    Effect.flatMap((response) => response.json),
    Effect.timeoutFail({
      duration: "1 seconds",
      onTimeout: () => new Timeout()
    }),
    Effect.retryN(3),
  )\
      `,
        highlights: [
          {
            color: '#283413',
            lines: [1, 7, 13, 14, 15, 16]
          },
        ]
      }
    },
    {
      name: 'Observability',
      description: 'Lorem ipsum dolor sit amet consectetur egestas maecenas sed.',
      color: '#10322E',
      withoutEffect: {
        fileName: 'index.ts',
        code: `\
const tracer = Otel.trace.getTracer("todos")

async function getTodo(
  id: number,
  {
    signal,
    retries,
  }: { retries?: number; signal?: AbortSignal },
): Promise<
  | { ok: true; todo: any }
  | {
      ok: false
      error: "InvalidJson" | "RequestFailed" | "Timeout"
    }
> {
  return tracer.startActiveSpan(
    "getTodo",
    { attributes: { id } },
    async (span) => {
      try {
        const result = await getTodoRetry(retries)
        if (result.ok) {
          span.setStatus({ code: Otel.SpanStatusCode.OK })
        } else {
          span.setStatus({
            code: Otel.SpanStatusCode.ERROR,
            message: result.error,
          })
        }
        return result
      } finally {
        span.end()
      }
    },
  )

  async function getTodoRetry(retries = 3): Promise<
    | { ok: true; todo: any }
    | {
        ok: false
        error: "InvalidJson" | "RequestFailed" | "Timeout"
      }
  > {
    try {
      const controller = new AbortController()
      setTimeout(() => controller.abort(), 1000)
      signal?.addEventListener("abort", () =>
        controller.abort(),
      )
      const response = await fetch(\`/todos/\${id}\`, {
        signal: controller.signal,
      })
      if (!response.ok) throw new Error("Not OK!")
      try {
        const todo = await response.json()
        return { ok: true, todo }
      } catch (jsonError) {
        if (retries > 0) {
          return getTodoRetry(retries - 1)
        }
        return { ok: false, error: "InvalidJson" }
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        return { ok: false, error: "Timeout" }
      } else if (retries > 0) {
        return getTodoRetry(retries - 1)
      }
      return { ok: false, error: "RequestFailed" }
    }
  }
}

      `,
        highlights: [
          {
            color: '#283413',
            lines: [1, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35]
          },
        ]
      },
      withEffect: {
        fileName: 'index.ts',
        code: `\
class Timeout extends Data.TaggedError("Timeout") {}

const getTodo = (
  id: number,
): Effect.Effect<
  never,
  HttpClientError | Timeout,
  unknown
> =>
  Http.request.get(\`/todos/\${id}\`).pipe(
    Http.client.fetchOk(),
    Effect.flatMap((response) => response.json),
    Effect.timeoutFail({
      duration: "1 seconds",
      onTimeout: () => new Timeout()
    }),
    Effect.retryN(3),
    Effect.withSpan("getTodo", { attributes: { id } }),
  )\
      `,
        highlights: [
          {
            color: '#283413',
            lines: [18]
          },
        ]
      }
    },
  ]
}
