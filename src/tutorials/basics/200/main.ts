import { Effect } from "effect"

function fooFunc(): string {
  return "foo"
}

async function asyncFooFunc(): Promise<string> {
  return "foo"
}

async function main() {
  // @ts-expect-error
  let foo = await Effect.runPromise(/* TODO: succeed with "foo" */)
  console.log("A", foo)

  // @ts-expect-error
  foo = await Effect.runPromise(/* TODO: wrap sync function `fooFunc` */)
  console.log("B", foo)

  // @ts-expect-error
  foo = await Effect.runPromise(/* TODO: wrap `asyncFooFunc` */)
  console.log("C", foo)
}

main()
