# Layers

```ts
import * as T from "@effect-ts/core/Effect"
import * as L from "@effect-ts/core/Effect/Layer"
import * as M from "@effect-ts/core/Effect/Managed"
import { pipe } from "@effect-ts/core/Function"
import { tag } from "@effect-ts/core/Has"
import type { _A } from "@effect-ts/core/Utils"

export interface DbConnection {
  readonly get: (k: string) => T.UIO<string>
  readonly set: (k: string, v: string) => T.UIO<void>
}

// Tag<DbConnection>
export const DbConnection = tag<DbConnection>(Symbol.for("@services/DbConnection"))

export declare const connectDb: T.UIO<DbConnection>
export declare const closeDb: (_: DbConnection) => T.UIO<void>

// M.Managed<unknown, never, DbConnection>
export const makeLiveDb = pipe(connectDb, T.toManagedRelease(closeDb))

// L.Layer<unknown, never, Has<DbConnection>>
export const LiveDb = L.fromManaged(DbConnection)(makeLiveDb)

// M.Managed<Has<DbConnection>, never, { ... }>
export const makeUserService = M.gen(function* (_) {
  const db = yield* _(DbConnection)

  return {
    create: (id: string, name: string) => db.set(id, name),
    get: (id: string) => db.get(id),
    all: (...ids: string[]) => T.forEach_(ids, db.get)
  }
})

export interface UserService extends _A<typeof makeUserService> {}

// Tag<UserService>
export const UserService = tag<UserService>(Symbol.for("@services/UserService"))

// L.Layer<Has<DbConnection>, never, Has<UserService>>
export const LiveUserService = L.fromManaged(UserService)(makeUserService)

export const { all, create, get } = T.deriveLifted(UserService)(
  ["all", "create", "get"],
  [],
  []
)

// T.Effect<Has<UserService>, never, Chunk<string>>
export const program = pipe(
  T.do,
  T.tap(() => create("001", "Mike")),
  T.tap(() => create("002", "Johannes")),
  T.chain(() => all("001", "002"))
)

// L.Layer<unknown, never, Has<UserService>>
export const Dependencies = LiveDb[">>>"](LiveUserService)

// T.Effect<unknown, never, Chunk<string>>
export const main = pipe(program, T.provideSomeLayer(LiveUserService))
```
