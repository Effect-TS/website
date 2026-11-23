interface Config {
  readonly name: string
  readonly retries: number
}

type Handler<A> = (a: A) => void

const config: Config = { name: "x", retries: 3 }

function fail<A>(value: A, handler?: Handler<A>): never {
  handler?.(value)
  throw new Error("boom at line 12 col 9")
}

fail<Config>(config)
