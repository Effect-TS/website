import { Effect } from "effect"

function fooFunc(): string {
  return "foo"
}

async function asyncFooFunc(): Promise<string> {
  return "foo"
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
