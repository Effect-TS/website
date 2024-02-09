import { Stream, Effect, Context } from "effect"

interface User {}

class Database extends Context.Tag("Database")<
  Database,
  {
    readonly getUsers: Effect.Effect<Array<User>>
  }
>() {}

// $ExpectType Effect<Database, never, User[]>
const getUsers = Database.pipe(Effect.flatMap((_) => _.getUsers))

// $ExpectType Stream<Database, never, User>
const users = Stream.fromIterableEffect(getUsers)
