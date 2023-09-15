import { Stream, Effect, Context } from "effect"

interface User {}

interface Database {
  readonly getUsers: Effect.Effect<never, never, Array<User>>
}

const Database = Context.Tag<Database>()

// $ExpectType Effect<Database, never, User[]>
const getUsers = Database.pipe(Effect.flatMap((_) => _.getUsers))

// $ExpectType Stream<Database, never, User>
const users = Stream.fromIterableEffect(getUsers)
