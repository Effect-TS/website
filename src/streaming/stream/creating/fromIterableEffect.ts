import { Stream, Effect, Context } from "effect"

interface User {}

class Database extends Context.Tag("Database")<
  Database,
  { readonly getUsers: Effect.Effect<Array<User>> }
>() {}

// $ExpectType Effect<User[], never, Database>
const getUsers = Database.pipe(Effect.flatMap((_) => _.getUsers))

// $ExpectType Stream<User, never, Database>
const users = Stream.fromIterableEffect(getUsers)
