import { Effect, Config, ConfigProvider, Layer, Console, Secret } from "effect"

const program = Effect.config(Config.secret("API_KEY")).pipe(
  Effect.tap((secret) => Console.log(`console.log: ${secret}`)),
  Effect.tap((secret) => Console.log(`Secret.value: ${Secret.value(secret)}`))
)

Effect.runSync(
  program.pipe(
    Effect.provide(
      Layer.setConfigProvider(
        ConfigProvider.fromMap(new Map([["API_KEY", "my-api-key"]]))
      )
    )
  )
)
/*
Output:
console.log: Secret(<redacted>)
Secret.value: my-api-key
*/
