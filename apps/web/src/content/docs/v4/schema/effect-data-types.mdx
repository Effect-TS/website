---
title: Effect Data Types
description: Define schemas for Option, Result, Exit, Effect collections, Duration, Redacted values, and configuration.
sidebar:
  order: 13
---

Effect provides schemas for its runtime data types, including `Option`, `Result`, `Exit`, hash collections, `Duration`, and `Redacted`.

These schemas expect the corresponding runtime value on both sides. Their inner schemas can still transform the contained values. When you need a JSON-compatible representation, derive it with `Schema.toCodecJson`.

**Example** (Runtime Values and Their JSON Representation)

```ts twoslash import.meta.vitest name="effect-data-types-json-representation-1"
import { Option, Schema } from "effect"

const RuntimeOption = Schema.Option(Schema.FiniteFromString)

Schema.decodeUnknownSync(RuntimeOption)(Option.some("1")) // => Option.some(1)
Schema.encodeSync(RuntimeOption)(Option.some(1)) // => Option.some("1")

const JsonOption = Schema.toCodecJson(RuntimeOption)

Schema.decodeUnknownSync(JsonOption)({ _tag: "Some", value: "1" }) // => Option.some(1)
Schema.encodeSync(JsonOption)(Option.some(1)) // => { _tag: "Some", value: "1" }
```

## Config

Use `Config.schema` to read and decode configuration with a schema. The provider supplies the encoded representation, and the resulting `Config` produces the schema's `Type`.

**Example** (Reading Structured Configuration)

```ts twoslash import.meta.vitest name="config-schema-1"
import { Config, ConfigProvider, Effect, Schema } from "effect"

const DatabaseConfig = Config.schema(
  Schema.Struct({
    host: Schema.String,
    port: Schema.Finite,
  }),
  "database",
)

const provider = ConfigProvider.fromUnknown({
  database: {
    host: "localhost",
    port: 5432,
  },
})

Effect.runSync(DatabaseConfig.parse(provider)) // => { host: "localhost", port: 5432 }
```

See [Configuration](/docs/v4/configuration/) for configuration providers, nesting, defaults, and secrets.

## Option

`Schema.Option(value)` describes `Option` values and applies `value` to the contents of `Some`.

**Example** (Transforming an Option's Value)

```ts twoslash import.meta.vitest name="option-1"
import { Option, Schema } from "effect"

const schema = Schema.Option(Schema.FiniteFromString)

// Option<string> -> Option<number>
Schema.decodeUnknownSync(schema)(Option.some("1")) // => Option.some(1)

// Option<number> -> Option<string>
Schema.encodeSync(schema)(Option.some(1)) // => Option.some("1")

Schema.decodeUnknownSync(schema)(Option.none()) // => Option.none()
```

### Options from Nullable and Optional Values

The following schemas transform common nullable and optional representations into `Option` values:

| Schema                     | Values decoded as `None`                   | Default encoding of `None` |
| -------------------------- | ------------------------------------------ | -------------------------- |
| `OptionFromUndefinedOr`    | `undefined`                                | `undefined`                |
| `OptionFromNullOr`         | `null`                                     | `null`                     |
| `OptionFromNullishOr`      | `null` or `undefined`                      | `undefined`                |
| `OptionFromOptionalKey`    | A missing property                         | A missing property         |
| `OptionFromOptional`       | A missing property or `undefined`          | A missing property         |
| `OptionFromOptionalNullOr` | A missing property, `null`, or `undefined` | A missing property         |

`OptionFromNullishOr` accepts an `onNoneEncoding` option of `null` or `undefined`. `OptionFromOptionalNullOr` accepts `"omit"`, `null`, or `undefined`.

**Example** (Mapping an Optional Property to Option)

```ts twoslash import.meta.vitest name="option-from-optional-key-1"
import { Option, Schema } from "effect"

const Profile = Schema.Struct({
  nickname: Schema.OptionFromOptionalKey(Schema.String),
})

Schema.decodeUnknownSync(Profile)({}) // => { nickname: Option.none() }
Schema.decodeUnknownSync(Profile)({ nickname: "Ada" }) // => { nickname: Option.some("Ada") }

Schema.encodeSync(Profile)({ nickname: Option.none() }) // => {}
```

**Example** (Mapping Nullish Values to Option)

```ts twoslash import.meta.vitest name="option-from-nullish-or-1"
import { Option, Schema } from "effect"

const schema = Schema.OptionFromNullishOr(Schema.FiniteFromString, {
  onNoneEncoding: null,
})

Schema.decodeUnknownSync(schema)(undefined) // => Option.none()
Schema.decodeUnknownSync(schema)(null) // => Option.none()
Schema.decodeUnknownSync(schema)("1") // => Option.some(1)

Schema.encodeSync(schema)(Option.none()) // => null
```

## Result

`Schema.Result(success, failure)` describes `Result` values and transforms the success and failure channels independently.

**Example** (Transforming Result Values)

```ts twoslash import.meta.vitest name="result-1"
import { Result, Schema } from "effect"

const schema = Schema.Result(Schema.FiniteFromString, Schema.Trim)

Schema.decodeUnknownSync(schema)(Result.succeed("1")) // => Result.succeed(1)
Schema.decodeUnknownSync(schema)(Result.fail(" error ")) // => Result.fail("error")

Schema.encodeSync(schema)(Result.succeed(1)) // => Result.succeed("1")
```

Its default JSON representation uses `{ _tag: "Success", success }` and `{ _tag: "Failure", failure }`.

**Example** (Result as JSON)

```ts twoslash import.meta.vitest name="result-json-1"
import { Result, Schema } from "effect"

const schema = Schema.toCodecJson(
  Schema.Result(Schema.FiniteFromString, Schema.Trim),
)

Schema.decodeUnknownSync(schema)({ _tag: "Success", success: "1" }) // => Result.succeed(1)
Schema.encodeSync(schema)(Result.fail("error")) // => { _tag: "Failure", failure: "error" }
```

## Exit

`Schema.Exit(success, failure, defect)` describes `Exit` values. It applies the supplied schemas to successful values, expected failures, and defects.

**Example** (Transforming Exit Values)

```ts twoslash import.meta.vitest name="exit-1"
import { Exit, Schema } from "effect"

const schema = Schema.Exit(
  Schema.FiniteFromString,
  Schema.Trim,
  Schema.Defect(),
)

Schema.decodeUnknownSync(schema)(Exit.succeed("1")) // => Exit.succeed(1)
Schema.decodeUnknownSync(schema)(Exit.fail(" error ")) // => Exit.fail("error")

Schema.encodeSync(schema)(Exit.succeed(1)) // => Exit.succeed("1")
```

The JSON representation uses `{ _tag: "Success", value }` for success and `{ _tag: "Failure", cause }` for failure.

**Example** (Exit as JSON)

```ts twoslash import.meta.vitest name="exit-json-1"
import { Exit, Schema } from "effect"

const schema = Schema.toCodecJson(
  Schema.Exit(Schema.FiniteFromString, Schema.String, Schema.Defect()),
)

Schema.decodeUnknownSync(schema)({ _tag: "Success", value: "1" }) // => Exit.succeed(1)
Schema.encodeSync(schema)(Exit.fail("not found")) // => { _tag: "Failure", cause: [{ _tag: "Fail", error: "not found" }] }
```

`Schema.Defect()` converts JSON-compatible defect data back into defects. Objects with `name`, `message`, and optionally `stack` are reconstructed as JavaScript errors.

## Collections

Schemas for Effect collections expect collection values on both sides and apply the element schemas during decoding and encoding. Their JSON codecs use arrays of values or key-value entries.

### ReadonlySet

**Example** (ReadonlySet Values and JSON)

```ts twoslash import.meta.vitest name="readonly-set-1"
import { Schema } from "effect"

const RuntimeSet = Schema.ReadonlySet(Schema.FiniteFromString)

Schema.decodeUnknownSync(RuntimeSet)(new Set(["1", "2"])) // => new Set([1, 2])
Schema.encodeSync(RuntimeSet)(new Set([1, 2])) // => new Set(["1", "2"])

const JsonSet = Schema.toCodecJson(RuntimeSet)

Schema.decodeUnknownSync(JsonSet)(["1", "2"]) // => new Set([1, 2])
Schema.encodeSync(JsonSet)(new Set([1, 2])) // => ["1", "2"]
```

### ReadonlyMap

**Example** (ReadonlyMap Values and JSON)

```ts twoslash import.meta.vitest name="readonly-map-1"
import { Schema } from "effect"

const RuntimeMap = Schema.ReadonlyMap(Schema.String, Schema.FiniteFromString)

Schema.decodeUnknownSync(RuntimeMap)(new Map([["a", "1"]])) // => new Map([["a", 1]])
Schema.encodeSync(RuntimeMap)(new Map([["a", 1]])) // => new Map([["a", "1"]])

const JsonMap = Schema.toCodecJson(RuntimeMap)

Schema.decodeUnknownSync(JsonMap)([["a", "1"]]) // => new Map([["a", 1]])
Schema.encodeSync(JsonMap)(new Map([["a", 1]])) // => [["a", "1"]]
```

### HashSet

**Example** (HashSet Values and JSON)

```ts twoslash import.meta.vitest name="hash-set-1"
import { HashSet, Schema } from "effect"

const RuntimeSet = Schema.HashSet(Schema.FiniteFromString)

Schema.decodeUnknownSync(RuntimeSet)(HashSet.fromIterable(["1", "2"])) // => HashSet.fromIterable([1, 2])

const JsonSet = Schema.toCodecJson(RuntimeSet)

Schema.decodeUnknownSync(JsonSet)(["1", "2"]) // => HashSet.fromIterable([1, 2])
Schema.encodeSync(JsonSet)(HashSet.fromIterable([1, 2])) // => ["1", "2"]
```

### HashMap

**Example** (HashMap Values and JSON)

```ts twoslash import.meta.vitest name="hash-map-1"
import { HashMap, Schema } from "effect"

const RuntimeMap = Schema.HashMap(Schema.String, Schema.FiniteFromString)

Schema.decodeUnknownSync(RuntimeMap)(HashMap.make(["a", "1"])) // => HashMap.make(["a", 1])

const JsonMap = Schema.toCodecJson(RuntimeMap)

Schema.decodeUnknownSync(JsonMap)([["a", "1"]]) // => HashMap.make(["a", 1])
Schema.encodeSync(JsonMap)(HashMap.make(["a", 1])) // => [["a", "1"]]
```

## Duration

`Schema.Duration` validates existing `Duration` values. Use a transformation schema when the encoded value is a string, a number of milliseconds, or a bigint number of nanoseconds.

| Schema                      | Encoded    | Type       |
| --------------------------- | ---------- | ---------- |
| `Schema.Duration`           | `Duration` | `Duration` |
| `Schema.DurationFromString` | `string`   | `Duration` |
| `Schema.DurationFromMillis` | `number`   | `Duration` |
| `Schema.DurationFromNanos`  | `bigint`   | `Duration` |

**Example** (Decoding Durations)

```ts twoslash import.meta.vitest name="duration-1"
import { Duration, Schema } from "effect"

Schema.decodeUnknownSync(Schema.Duration)(Duration.seconds(2)) // => Duration.seconds(2)

Schema.decodeUnknownSync(Schema.DurationFromString)("2 seconds") // => Duration.seconds(2)
Schema.encodeSync(Schema.DurationFromString)(Duration.seconds(2)) // => "2000 millis"

Schema.decodeUnknownSync(Schema.DurationFromMillis)(2000) // => Duration.seconds(2)
Schema.encodeSync(Schema.DurationFromMillis)(Duration.seconds(2)) // => 2000

Schema.decodeUnknownSync(Schema.DurationFromNanos)(2_000_000_000n) // => Duration.nanos(2_000_000_000n)
```

The default JSON representation of `Schema.Duration` is a tagged object that preserves milliseconds, nanoseconds, and infinite durations.

**Example** (Duration as JSON)

```ts twoslash import.meta.vitest name="duration-json-1"
import { Duration, Schema } from "effect"

const schema = Schema.toCodecJson(Schema.Duration)

Schema.encodeSync(schema)(Duration.seconds(2)) // => { _tag: "Millis", value: 2000 }
Schema.decodeUnknownSync(schema)({ _tag: "Millis", value: 2000 }) // => Duration.seconds(2)
```

## Redacted

`Schema.Redacted(value)` validates existing `Redacted` values and applies `value` to their hidden contents. Use `Schema.RedactedFromValue(value)` to decode a raw value and wrap it in `Redacted`.

**Example** (Decoding Raw Values as Redacted)

```ts twoslash import.meta.vitest name="redacted-from-value-1"
import { Redacted, Schema } from "effect"

const schema = Schema.RedactedFromValue(Schema.Trim)

const secret = Schema.decodeUnknownSync(schema)(" secret ")

Redacted.value(secret) // => "secret"
Schema.encodeSync(schema)(secret) // => "secret"
```

The default JSON representation of `Schema.Redacted(value)` exposes the encoded inner value. If a redacted value must never be serialized, set `disallowJsonEncode: true`.

**Example** (Preventing JSON Encoding)

```ts twoslash
import { Redacted, Schema } from "effect"

const Secret = Schema.Redacted(Schema.String, {
  label: "Secret",
  disallowJsonEncode: true,
})

const JsonSecret = Schema.toCodecJson(Secret)

// Encoding fails instead of exposing "password"
Schema.encodeSync(JsonSecret)(Redacted.make("password", { label: "Secret" }))
```
