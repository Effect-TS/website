import { Effect, Console } from "effect"

interface Config {
  // ...
}

const makeConfig = (/* ... */): Config => ({})

const remoteConfig = (name: string): Effect.Effect<never, Error, Config> =>
  Effect.gen(function* (_) {
    if (name === "node3") {
      yield* _(Console.log(`Config for ${name} found`))
      return makeConfig()
    } else {
      yield* _(Console.log(`Unavailable config for ${name}`))
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
Unavailable config for master
Unavailable config for node1
Unavailable config for node2
Config for node3 found
{}
*/
