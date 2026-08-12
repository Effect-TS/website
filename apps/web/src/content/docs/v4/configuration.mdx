---
title: Configuration
description: Describe, load, validate, and test application configuration with Config and ConfigProvider.
sidebar:
  order: 5
---

Effect separates the **description** of a configuration from the source that supplies its values:

- A `Config<T>` describes how to load and decode a value of type `T`. It is also an `Effect<T, ConfigError>`, so it can be yielded directly inside `Effect.gen`.
- A `ConfigProvider` supplies the raw values. The default provider reads environment variables.

Keeping these concerns separate lets application code define its requirements once and choose a different provider for production, local development, or tests.

## Defining and Parsing a Config

Use the constructors in the `Config` module for individual values and `Config.all` to combine them.

**Example** (Parsing a Config with a Specific Provider)

```ts twoslash import.meta.vitest name="parsing-a-config-1"
import { Config, ConfigProvider, Effect } from "effect"

const AppConfig = Config.all({
  host: Config.nonEmptyString("HOST"),
  port: Config.port("PORT"),
})

const provider = ConfigProvider.fromEnv({
  env: {
    HOST: "localhost",
    PORT: "8080",
  },
})

const result = Effect.runSync(AppConfig.parse(provider))

result // => { host: "localhost", port: 8080 }
```

Calling `config.parse(provider)` is useful when the provider is already available explicitly, especially in tests.

In application code, a `Config` can instead be yielded as an Effect. It then uses the `ConfigProvider` installed in the Effect context. When no provider is installed explicitly, Effect uses `ConfigProvider.fromEnv()`.

**Example** (Using the Default Environment Provider)

```ts twoslash title="app.ts"
import { Config, Effect } from "effect"

const AppConfig = Config.all({
  host: Config.nonEmptyString("HOST"),
  port: Config.port("PORT").pipe(Config.withDefault(8080)),
})

const program = Effect.gen(function* () {
  const { host, port } = yield* AppConfig
  console.log(`Application started: ${host}:${port}`)
})

Effect.runPromise(program)
```

```sh showLineNumbers=false
HOST=localhost PORT=3000 npx tsx app.ts
```

```ansi showLineNumbers=false
Application started: localhost:3000
```

## Built-in Config Values

Effect provides convenience constructors for common scalar values:

| Constructor               | Result                                                   |
| ------------------------- | -------------------------------------------------------- |
| `string(name?)`           | A string                                                 |
| `nonEmptyString(name?)`   | A non-empty string                                       |
| `finite(name?)`           | A finite number                                          |
| `int(name?)`              | An integer                                               |
| `port(name?)`             | An integer between 1 and 65,535                          |
| `boolean(name?)`          | A boolean                                                |
| `literal(value, name?)`   | One literal value                                        |
| `literals(values, name?)` | One of several literal values                            |
| `duration(name?)`         | A `Duration`                                             |
| `date(name?)`             | A `Date`                                                 |
| `url(name?)`              | A `URL`                                                  |
| `logLevel(name?)`         | A [LogLevel](/docs/v4/observability/logging/#log-levels) |
| `redacted(name?)`         | A [`Redacted<string>`](/docs/v4/data-types/redacted/)    |

For ordinary numeric settings, prefer `Config.finite`. `Config.number` also accepts non-finite values such as `NaN` and `Infinity`, which are rarely valid configuration values.

`Config.boolean` accepts the case-sensitive strings `true`, `false`, `yes`, `no`, `on`, `off`, `1`, `0`, `y`, and `n`.

## Using Config with Schema

Use `Config.schema` when a setting needs a custom type, validation, or a structured representation. The provider supplies the encoded representation and the resulting `Config` produces the schema's `Type`.

**Example** (Validating a Configuration Value)

```ts twoslash import.meta.vitest name="config-schema-validation-1"
import { Config, ConfigProvider, Effect, Schema } from "effect"

const Username = Schema.String.check(
  Schema.isMinLength(4, { message: "Expected at least 4 characters" }),
)

const username = Config.schema(Username, "USERNAME")
const provider = ConfigProvider.fromEnv({ env: { USERNAME: "alice" } })

Effect.runSync(username.parse(provider)) // => "alice"
```

Schemas can also describe an entire configuration object.

**Example** (Reading Structured Configuration)

```ts twoslash import.meta.vitest name="structured-config-1"
import { Config, ConfigProvider, Effect, Schema } from "effect"

const ServerConfig = Config.schema(
  Schema.Struct({
    host: Schema.String,
    port: Config.Port,
  }),
  "server",
)

const provider = ConfigProvider.fromUnknown({
  server: {
    host: "localhost",
    port: 8080,
  },
})

Effect.runSync(ServerConfig.parse(provider)) // => { host: "localhost", port: 8080 }
```

`Config.schema` derives a tree-shaped string encoding from the schema. This allows the same structured config to read `SERVER_HOST` and `SERVER_PORT` from an environment provider, or `{ server: { host, port } }` from `ConfigProvider.fromUnknown`.

See [Schema: Config](/docs/v4/schema/effect-data-types/#config) for more details.

### Arrays and Records

`Config.Array` and `Config.Record` are schemas for values that may be supplied either structurally or as one separated string. Pass them to `Config.schema`; they are not `Config` combinators.

**Example** (Reading a Comma-Separated Array)

```ts twoslash import.meta.vitest name="config-array-1"
import { Config, ConfigProvider, Effect, Schema } from "effect"

const exporters = Config.schema(Config.Array(Schema.String), "EXPORTERS")
const provider = ConfigProvider.fromEnv({
  env: { EXPORTERS: "otlp,prometheus" },
})

Effect.runSync(exporters.parse(provider)) // => ["otlp", "prometheus"]
```

`Config.Record(key, value)` similarly accepts either a record or a string such as `"service.name=api,service.version=1.0"`. Both schemas accept options for customizing their separators.

Plain `Schema.Array` and `Schema.Record` remain useful when the provider must supply a structural array or object rather than a separated scalar value.

## Combining Configs

`Config.all` combines configs into a tuple or a named object while preserving the input shape.

**Example** (Combining and Nesting Configs)

```ts twoslash import.meta.vitest name="combining-and-nesting-configs-1"
import { Config, ConfigProvider, Effect } from "effect"

const DatabaseConfig = Config.all({
  host: Config.nonEmptyString("HOST"),
  port: Config.port("PORT"),
}).pipe(Config.nested("DATABASE"))

const provider = ConfigProvider.fromEnv({
  env: {
    DATABASE_HOST: "localhost",
    DATABASE_PORT: "5432",
  },
})

Effect.runSync(DatabaseConfig.parse(provider)) // => { host: "localhost", port: 5432 }
```

`Config.nested(config, path)` prepends a string or path to every lookup performed by that config. With `ConfigProvider.fromEnv`, path segments are joined with `_`.

For APIs that accept either an already-built `Config<T>` or a nested record of configs, `Config.Wrap<T>` and `Config.unwrap` provide the corresponding input type and conversion.

## Defaults and Optional Values

`Config.withDefault` supplies a value only when none of the relevant input is present.

**Example** (Providing a Default)

```ts twoslash import.meta.vitest name="config-default-1"
import { Config, ConfigProvider, Effect } from "effect"

const port = Config.port("PORT").pipe(Config.withDefault(8080))
const provider = ConfigProvider.fromUnknown({})

Effect.runSync(port.parse(provider)) // => 8080
```

Invalid input is not treated as missing. For example, `PORT=not-a-port` still fails instead of silently producing `8080`. The same rule applies to a combined config: if part of the group is supplied, a missing or invalid sibling makes the group incomplete rather than replacing the whole group with a default.

Use `Config.option` when absence should produce an `Option` instead.

**Example** (Reading an Optional Value)

```ts twoslash import.meta.vitest name="optional-config-1"
import { Config, ConfigProvider, Effect, Option } from "effect"

const apiKey = Config.string("API_KEY").pipe(Config.option)
const provider = ConfigProvider.fromUnknown({})

Effect.runSync(apiKey.parse(provider)) // => Option.none()
```

### Falling Back After Any Config Error

`Config.orElse` is broader than `Config.withDefault`: it tries another config after any `ConfigError`, including invalid input.

**Example** (Falling Back to Another Config)

```ts twoslash import.meta.vitest name="config-or-else-1"
import { Config, ConfigProvider, Effect } from "effect"

const host = Config.string("HOST").pipe(
  Config.orElse(() => Config.string("FALLBACK_HOST")),
)

const provider = ConfigProvider.fromUnknown({ FALLBACK_HOST: "localhost" })

Effect.runSync(host.parse(provider)) // => "localhost"
```

Because `orElse` can recover from validation errors, use it only when replacing invalid input is intentional. Use `withDefault` for the common case where only absence should trigger a fallback.

## Transforming Values

Use `Config.map` for a transformation that cannot fail.

**Example** (Mapping a Config)

```ts twoslash import.meta.vitest name="mapping-a-config-1"
import { Config, ConfigProvider, Effect } from "effect"

const origin = Config.all({
  host: Config.nonEmptyString("HOST"),
  port: Config.port("PORT"),
}).pipe(Config.map(({ host, port }) => `http://${host}:${port}`))

const provider = ConfigProvider.fromUnknown({
  HOST: "localhost",
  PORT: 8080,
})

Effect.runSync(origin.parse(provider)) // => "http://localhost:8080"
```

For validation and parsing, prefer expressing the rules in a schema and using `Config.schema`. `Config.mapOrFail` is available when a transformation instead needs to return an `Effect<B, ConfigError>`.

## Handling Sensitive Values

`Config.redacted` wraps a string in `Redacted<string>`, whose string representation does not reveal the value. Accessing the secret requires an explicit call to `Redacted.value`.

**Example** (Protecting a Secret)

```ts twoslash import.meta.vitest name="redacted-config-1"
import { Config, ConfigProvider, Effect, Redacted } from "effect"

const apiKey = Config.redacted("API_KEY")
const provider = ConfigProvider.fromEnv({
  env: { API_KEY: "secret-value" },
})

const result = Effect.runSync(apiKey.parse(provider))

String(result) // => "<redacted>"
Redacted.value(result) // => "secret-value"
```

To decode a value and then wrap it, combine `Config.schema` with `Schema.RedactedFromValue`.

```ts twoslash import.meta.vitest name="redacted-schema-config-1"
import { Config, ConfigProvider, Effect, Redacted, Schema } from "effect"

const secretNumber = Config.schema(
  Schema.RedactedFromValue(Schema.FiniteFromString),
  "SECRET_NUMBER",
)

const provider = ConfigProvider.fromEnv({
  env: { SECRET_NUMBER: "42" },
})

const result = Effect.runSync(secretNumber.parse(provider))

Redacted.value(result) // => 42
```

## Config Providers

The `ConfigProvider` module includes providers for several common sources:

| Constructor          | Source                                                     |
| -------------------- | ---------------------------------------------------------- |
| `fromEnv`            | Environment variables                                      |
| `fromUnknown`        | An in-memory JavaScript value, including parsed JSON       |
| `fromDotEnvContents` | The contents of a `.env` file                              |
| `fromDotEnv`         | A `.env` file read through the `FileSystem` service        |
| `fromDir`            | A directory tree, including mounted ConfigMaps and Secrets |
| `make`               | A custom backing store                                     |

`fromEnv` merges `process.env` and `import.meta.env` by default. Passing `{ env }` replaces that source, which makes it convenient for tests and non-Node runtimes.

Both `fromEnv` and `fromUnknown` treat an empty string as missing by default. Pass `{ preserveEmptyStrings: true }` when an empty string is a meaningful value.

### Loading an In-Memory Object

Use `ConfigProvider.fromUnknown` for a JavaScript value or parsed JSON object. Object keys and array indexes become configuration path segments.

**Example** (Loading a Parsed JSON Object)

```ts twoslash import.meta.vitest name="provider-from-unknown-1"
import { Config, ConfigProvider, Effect } from "effect"

const provider = ConfigProvider.fromUnknown(
  JSON.parse(`{"server":{"host":"localhost","port":8080}}`),
)

const server = Config.all({
  host: Config.string("host"),
  port: Config.port("port"),
}).pipe(Config.nested("server"))

Effect.runSync(server.parse(provider)) // => { host: "localhost", port: 8080 }
```

### Loading .env Files and Directories

`ConfigProvider.fromDotEnvContents` parses an already-loaded string. `ConfigProvider.fromDotEnv()` reads `.env` from the current directory by default and returns an Effect that requires the `FileSystem` service.

`ConfigProvider.fromDir()` reads each file as a leaf value and each directory as a record. This is useful for configuration mounted as files, such as Kubernetes ConfigMaps and Secrets. It requires the `FileSystem` and `Path` services.

### Transforming Provider Paths

Provider combinators change how all configs look up their paths:

- `ConfigProvider.nested` prefixes every lookup.
- `ConfigProvider.constantCase` converts string path segments to `CONSTANT_CASE`.
- `ConfigProvider.mapInput` performs an arbitrary path transformation.

**Example** (Adapting camelCase Keys to Environment Variables)

```ts twoslash import.meta.vitest name="provider-constant-case-1"
import { Config, ConfigProvider, Effect } from "effect"

const provider = ConfigProvider.fromEnv({
  env: { DATABASE_HOST: "localhost" },
}).pipe(ConfigProvider.constantCase)

const databaseHost = Config.string("databaseHost")

Effect.runSync(databaseHost.parse(provider)) // => "localhost"
```

### Combining Providers

`ConfigProvider.orElse(primary, fallback)` consults the fallback only when the primary provider has no value at a requested path. Unlike `Config.orElse`, it does not recover from source errors or schema validation errors.

**Example** (Adding Provider Defaults)

```ts twoslash import.meta.vitest name="combining-providers-1"
import { Config, ConfigProvider, Effect } from "effect"

const environment = ConfigProvider.fromEnv({
  env: { HOST: "production.example.com" },
})

const defaults = ConfigProvider.fromUnknown({
  HOST: "localhost",
  PORT: 8080,
})

const provider = ConfigProvider.orElse(environment, defaults)
const app = Config.all({
  host: Config.string("HOST"),
  port: Config.port("PORT"),
})

Effect.runSync(app.parse(provider)) // => { host: "production.example.com", port: 8080 }
```

### Installing a Provider

Use `ConfigProvider.layer(provider)` to replace the provider used by configs yielded as Effects. `ConfigProvider.layerAdd(provider)` instead adds a fallback to the current provider; pass `{ asPrimary: true }` to make the added provider take precedence.

**Example** (Providing a ConfigProvider Layer)

```ts twoslash import.meta.vitest name="provider-layer-1"
import { Config, ConfigProvider, Effect } from "effect"

const provider = ConfigProvider.fromUnknown({ PORT: 8080 })
const ProviderLayer = ConfigProvider.layer(provider)

const program = Effect.gen(function* () {
  return yield* Config.port("PORT")
})

Effect.runSync(Effect.provide(program, ProviderLayer)) // => 8080
```

For a single config, `config.parse(provider)` is simpler and does not change the provider for the rest of the Effect program.
