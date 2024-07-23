import { Effect } from "effect"

function fooFunc(): string {
  return "foo"
}

function asyncFooFunc(): Promise<string> {
  return Promise.resolve("foo")
}

async function main() {
  let foo = await Effect.runPromise(Effect.succeed("foo"))
  console.log("A", foo)

  foo = await Effect.runPromise(Effect.sync(fooFunc))
  console.log("B", foo)

  foo = await Effect.runPromise(Effect.promise(asyncFooFunc))
  console.log("C", foo)
}

main()
