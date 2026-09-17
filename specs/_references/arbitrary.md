# Native Arbitrary in Effect 4

## Import and entry point

Use the unstable arbitrary barrel and its `Arbitrary` namespace:

```ts
import { Effect, Schema } from "effect"
import { Arbitrary } from "effect/unstable/arbitrary"
```

`Arbitrary<A>` is a pure, pipeable description backed by a native generator. The public module delegates construction and execution to Effect's internal runner, and Effect's own schema test helpers import that same module directly. Treat both the module and replay format as unstable.

Sources: `node_modules/effect/src/unstable/arbitrary/Arbitrary.ts:1-16,18-54,120-140`; `node_modules/effect/src/testing/TestSchema.ts:12-27`.

## Derive, sample, and check

`Arbitrary.schema(schema)` derives values from the schema's decoded `Type`. Compilation happens when `schema` is called. It throws if the compiler cannot derive a generator or cannot find a finite route through a recursive schema.

```ts
const Person = Schema.Struct({
  name: Schema.NonEmptyString,
  age: Schema.Int,
})

const arbitrary = Arbitrary.schema(Person)

const samples = await Effect.runPromise(
  Arbitrary.sampleEffect(arbitrary, { count: 10, seed: 42 }),
)
```

`sampleEffect` returns `Effect<ReadonlyArray<A>, SampleError>`. Its defaults are `count: 10`, `size: 10`, and `maxDiscards: max(100, count * 10)`. Without a supplied seed it obtains one from Effect's `Random` service. Exhaustion fails with the generated count, discard count, and effective seed.

Sources: `node_modules/effect/src/unstable/arbitrary/Arbitrary.ts:83-118,323-351,666-681`; `node_modules/effect/src/internal/arbitrary/runner.ts:73-83,205-224,422-449`; `node_modules/effect/src/internal/arbitrary/schema.ts:1027-1038,1718-1746`.

`checkEffect` accepts a property returning either `boolean` or `Effect<boolean, E, R>`. A returned `false` and a typed Effect failure are falsifications. Defects and interruption stay in the Effect channel instead of becoming `CheckResult` values.

```ts
const result = await Effect.runPromise(
  Arbitrary.checkEffect(arbitrary, ({ age }) => age >= 0, {
    runs: 100,
    seed: 42,
  }),
)

const message = Arbitrary.formatCheckFailure(result)
```

`formatCheckFailure` returns `undefined` for `Passed` and a test-runner-ready message otherwise. `TestSchema.Asserts` uses this exact pattern for generated-value validation and encode/decode round trips.

Sources: `node_modules/effect/src/unstable/arbitrary/Arbitrary.ts:175-321,683-715`; `node_modules/effect/src/internal/arbitrary/runner.ts:451-464,537-608`; `node_modules/effect/src/testing/TestSchema.ts:24-27,154-197,259-293`.

## Combinators

The native combinator set is deliberately small:

- `Constant(value)` always emits the same value and has no shrinks.
- `map` transforms generated values and their shrink candidates.
- `filter` keeps values satisfying a predicate or refinement. Rejected roots consume the discard budget.
- `filterMap` transforms successes and discards failures.
- `flatMap` chooses a dependent arbitrary. During shrinking it tries smaller source values first, then dependent shrinks; after choosing a dependent shrink, that branch no longer shrinks the source.
- `all` combines an iterable, tuple, array, or record. It preserves tuple positions and record keys, and shrinks one member at a time.

All data-last combinators work with `.pipe(...)` because `Arbitrary` implements `Pipeable`.

Sources: `node_modules/effect/src/unstable/arbitrary/Arbitrary.ts:35-54,353-408,410-554,556-664`; `node_modules/effect/src/internal/arbitrary/runner.ts:227-310,328-420`.

## Options and results

`SampleOptions` has `count`, `size`, `maxDiscards`, and `seed`. `CheckOptions` has `runs`, `size`, `maxDiscards`, `maxShrinks`, `seed`, and `replay`. Numeric options must be non-negative safe integers, while `runs` must also be greater than zero.

Normal checking defaults are `runs: 100`, `size: 10`, `maxDiscards: max(100, runs * 10)`, and `maxShrinks: 100`. Size grows with completed runs; discarded attempts do not advance it. A one-run check uses the configured size directly.

`CheckResult<A, E>` is a tagged union:

- `Passed` reports `runs` and `discards`.
- `Falsified` reports `initialInput`, `shrunkInput`, the typed failure class, `runs`, `discards`, accepted `shrinks`, and `replay`.
- `Exhausted` reports `runs`, `discards`, and the effective `seed`.
- `ReplayMismatch` reports why the recorded coordinates no longer reproduce the failure.

Sources: `node_modules/effect/src/unstable/arbitrary/Arbitrary.ts:83-100,142-173,175-286`; `node_modules/effect/src/internal/arbitrary/runner.ts:73-83,565-608`.

## Shrinking and replay

Schema-derived arbitraries carry native shrink trees. `checkEffect` follows the first child that fails with the same failure class as the root, either `ReturnedFalse` or `PropertyError`. Typed error values may change and are not compared. `maxShrinks` limits inspected candidates, including discarded candidates and candidates with the wrong failure class; `Falsified.shrinks` counts only accepted smaller failures.

`Arbitrary.schema(schema, { shrink })` replaces Schema-derived shrinking with a custom immediate-child function. Roots still come from Schema derivation. Every custom shrink candidate is validated against the decoded schema before the property sees it. The callback must be synchronous, deterministic, terminating, and mutation-free.

A replay token records seed, attempt, size, shrink-path indexes, and failure class. Pass it back as `{ replay: result.replay }`. Replay regenerates one attempt and follows the recorded shrink path. It ignores `runs`, `size`, `maxDiscards`, `maxShrinks`, and `seed`; incompatible behavior returns `ReplayMismatch` with `AttemptDiscarded`, `PropertyPassed`, `ShrinkPathUnavailable`, or `ShrinkPassed`.

Sources: `node_modules/effect/src/unstable/arbitrary/Arbitrary.ts:56-69,120-172,217-286,323-351,683-704`; `node_modules/effect/src/internal/arbitrary/runner.ts:51-70,208-224,469-562,589-604`.

## Schema customization

### `arbitraryConstraint`

Put native generation hints directly on `Schema.Annotations.Filter` as `arbitraryConstraint`. Supported fields cover inclusive or exclusive bounds, string length, collection size, property counts, regex patterns, finite or integer numbers, uniqueness, and an `Order` used while merging filter bounds.

Constraints guide construction but never replace validation. The compiler merges constraints from all checks, generates with the normalized result, then applies every filter predicate to roots and shrink candidates. Opaque filters may therefore cause discards and exhaustion. `Order` is removed before constraints reach a declaration callback.

Effect's built-in string filters show the intended shape:

```ts
arbitraryConstraint: {
  patterns: [{ source: pattern.source, flags: pattern.flags }]
}
```

Sources: `node_modules/effect/src/Schema.ts:6515-6557,6856-6885,15783-15910`; `node_modules/effect/src/internal/arbitrary/schema.ts:17-23,82-180,1027-1075`.

### `toCodecArbitrary`

Opaque declarations can provide `toCodecArbitrary`. Its callback receives decoded type-parameter schemas plus the normalized generation constraint and returns a `SchemaAST.Link`. The compiler generates the Link's source representation, decodes it, and validates the declaration.

`toCodecArbitrary` takes precedence over built-in declaration handling and the `toCodecJson` or `toCodec` fallbacks. Its Link may be partial or asynchronous, but cannot require services because the resulting `Arbitrary` exposes none. Effect's `BigDecimal` declaration is a concrete example: it converts numeric constraints into a generatable struct and links that representation back to `BigDecimal`.

Sources: `node_modules/effect/src/Schema.ts:10154-10245,15758-15771,15903-15920`; `node_modules/effect/src/internal/arbitrary/schema.ts:1668-1715`.

## Remove the old fast-check material

Rewrite examples around the native API above:

| Remove                                                 | Use now                                                                                  |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `Schema.toArbitrary(...)` and lazy FastCheck injection | `Arbitrary.schema(...)`                                                                  |
| `FastCheck.sample(...)`                                | `Arbitrary.sampleEffect(...)`                                                            |
| FastCheck property/assert/report plumbing              | `Arbitrary.checkEffect(...)`, inspect `CheckResult`, then call `formatCheckFailure(...)` |
| FastCheck arbitrary factories in schema annotations    | `arbitraryConstraint` for filters or `toCodecArbitrary` for declarations                 |
| Claims that Effect exposes the full FastCheck catalog  | Document only `Constant`, `map`, `filter`, `filterMap`, `flatMap`, and `all`             |

The implementation borrows some shrinking and scheduling ideas from fast-check, but generation, PRNG state, discards, shrinking, replay, and result types are Effect-owned. Those comments are implementation provenance, not a public FastCheck integration.

Sources: `node_modules/effect/src/unstable/arbitrary/Arbitrary.ts:323-715`; `node_modules/effect/src/internal/arbitrary/runner.ts:85-206,373-420,469-608`; `node_modules/effect/src/internal/arbitrary/schema.ts:394-429,740-765,867-1024`; `node_modules/effect/src/Schema.ts:15758-15920`; `node_modules/effect/src/testing/TestSchema.ts:22-27,179-196,284-291`.
