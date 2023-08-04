import { Effect } from "effect"

Effect.runPromiseExit(Effect.succeed(1)).then((result1) => console.log(result1))
/*
{ _tag: 'Success', value: 1 }
*/

Effect.runPromiseExit(Effect.fail("error")).then((result2) =>
  console.log(result2)
)
/*
{ _tag: 'Failure', cause: { _tag: 'Cause', errors: [ [Object] ] } }
*/
