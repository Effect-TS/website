import { Effect } from "effect"

interface Config {
  // ...
}

const makeConfig = (/* ... */): Config => ({})

const remoteConfig = (name: string): Effect.Effect<never, Error, Config> =>
  Effect.gen(function* (_) {
    if (name === "node3") {
      yield* _(Effect.log(`Config for ${name} found`))
      return makeConfig()
    } else {
      yield* _(Effect.log(`Unavailable config for ${name}`))
      return yield* _(Effect.fail(new Error()))
    }
  })

// $ExpectType Effect<never, Error, Config>
const masterConfig = remoteConfig("master")

// $ExpectType Effect<never, Error, Config>[]
const nodeConfigs = ["node1", "node2", "node3", "node4"].map(remoteConfig)

// $ExpectType Effect<never, Error, Config>
const config = Effect.firstSuccessOf([masterConfig, ...nodeConfigs])

console.log(Effect.runSync(config))
/*
... message="Unavailable config for master"
... message="Unavailable config for node1"
... message="Unavailable config for node2"
... message="Config for node3 found"
*/
