import { Effect } from "effect"

interface Config {
  // ...
}

const remoteConfig = (name: string): Effect.Effect<never, Error, Config> =>
  name === "node3"
    ? Effect.log(`Config for ${name} found`).pipe(
        Effect.flatMap(() => Effect.succeed({}))
      )
    : Effect.log(`Unavailable config for ${name}`).pipe(
        Effect.flatMap(() => Effect.fail(new Error()))
      )

// Effect<never, Error, Config>
const masterConfig = remoteConfig("master")

// Effect<never, Error, Config>[]
const nodeConfigs = ["node1", "node2", "node3", "node4"].map(remoteConfig)

// Effect<never, Error, Config>
const config = Effect.firstSuccessOf([masterConfig, ...nodeConfigs])

console.log(Effect.runSync(config))
/*
... message="Unavailable config for master"
... message="Unavailable config for node1"
... message="Unavailable config for node2"
... message="Config for node3 found"
*/
