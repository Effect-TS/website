## Schedule

A `Schedule<Env, In, Out>` defines a recurring schedule, which consumes
values of type `In`, and which returns values of type `Out`.

Schedules are defined as a possibly infinite set of intervals spread out over
time. Each interval defines a window in which recurrence is possible.

When schedules are used to repeat or retry effects, the starting boundary of
each interval produced by a schedule is used as the moment when the effect
will be executed again.

Schedules compose in the following primary ways:

- Union: performs the union of the intervals of two schedules
- Intersection: performs the intersection of the intervals of two schedules
- Sequence: concatenates the intervals of one schedule onto another

In addition, schedule inputs and outputs can be transformed, filtered (to
terminate a schedule early in response to some input or output), and so
forth.

A variety of other operators exist for transforming and combining schedules,
and the companion object for `Schedule` contains all common types of
schedules, both for performing retrying, as well as performing repetition.

```ts
export interface Schedule<State, Env, In, Out> {
    readonly [ScheduleSym]: ScheduleSym;
    readonly [_Env]: () => Env;
    readonly [_In]: (_: In) => void;
    readonly [_Out]: () => Out;
    readonly initial: State;
    readonly step: (now: number, input: In, state: State) => Effect<Env, never, readonly [State, Out, Decision]>;
}
```

## General API

### addDelay

Returns a new schedule with the given delay added to every interval defined
by this schedule.

```ts
export declare const addDelay: <Out>(f: (out: Out) => Duration) => <State, Env_1, In>(self: Schedule<State, Env_1, In, Out>) => Schedule<State, Env_1, In, Out>;
```

### addDelayEffect

Returns a new schedule with the given effectfully computed delay added to
every interval defined by this schedule.

```ts
export declare const addDelayEffect: <Out, Env1>(f: (out: Out) => Effect<Env1, never, Duration>) => <State, Env_1, In>(self: Schedule<State, Env_1, In, Out>) => Schedule<State, Env1 | Env_1, In, Out>;
```

### andThen

The same as `andThenEither`, but merges the output.

```ts
export declare const andThen: <State1, Env1, In1, Out2>(that: Schedule<State1, Env1, In1, Out2>) => <State, Env_1, In, Out>(self: Schedule<State, Env_1, In, Out>) => Schedule<readonly [State, State1, boolean], Env1 | Env_1, In & In1, Out2 | Out>;
```

### andThenEither

Returns a new schedule that first executes this schedule to completion, and
then executes the specified schedule to completion.

```ts
export declare const andThenEither: <State1, Env1, In1, Out2>(that: Schedule<State1, Env1, In1, Out2>) => <State, Env_1, In, Out>(self: Schedule<State, Env_1, In, Out>) => Schedule<readonly [State, State1, boolean], Env1 | Env_1, In & In1, Either<Out, Out2>>;
```

### as

Returns a new schedule that maps this schedule to a constant output.

```ts
export declare const as: <Out2>(out2: Out2) => <State, Env_1, In, Out>(self: Schedule<State, Env_1, In, Out>) => Schedule<State, Env_1, In, Out2>;
```

### bothInOut

Returns a new schedule that has both the inputs and outputs of this and the
specified schedule.

```ts
export declare const bothInOut: <State1, Env1, In2, Out2>(that: Schedule<State1, Env1, In2, Out2>) => <State, Env_1, In, Out>(self: Schedule<State, Env_1, In, Out>) => Schedule<readonly [State, State1], Env1 | Env_1, readonly [In, In2], readonly [Out, Out2]>;
```

### check

Returns a new schedule that passes each input and output of this schedule
to the specified function, and then determines whether or not to continue
based on the return value of the function.

```ts
export declare const check: <In, Out>(test: (input: In, output: Out) => boolean) => <State, Env_1>(self: Schedule<State, Env_1, In, Out>) => Schedule<State, Env_1, In, Out>;
```

### checkEffect

Returns a new schedule that passes each input and output of this schedule
to the specified function, and then determines whether or not to continue
based on the return value of the function.

```ts
export declare const checkEffect: <In, Out, Env1>(test: (input: In, output: Out) => Effect<Env1, never, boolean>) => <State, Env_1>(self: Schedule<State, Env_1, In, Out>) => Schedule<State, Env1 | Env_1, In, Out>;
```

### choose

Returns a new schedule that allows choosing between feeding inputs to this
schedule, or feeding inputs to the specified schedule.

```ts
export declare const choose: <State1, Env1, In2, Out2>(that: Schedule<State1, Env1, In2, Out2>) => <State, Env_1, In, Out>(self: Schedule<State, Env_1, In, Out>) => Schedule<readonly [State, State1], Env1 | Env_1, Either<In, In2>, Either<Out, Out2>>;
```

### chooseMerge

Returns a new schedule that chooses between two schedules with a common
output.

```ts
export declare const chooseMerge: <State1, Env1, In2, Out2>(that: Schedule<State1, Env1, In2, Out2>) => <State, Env_1, In, Out>(self: Schedule<State, Env_1, In, Out>) => Schedule<readonly [State, State1], Env1 | Env_1, Either<In, In2>, Out2 | Out>;
```

### collectAll

A schedule that recurs anywhere, collecting all inputs into a `Chunk`.

```ts
export declare const collectAll: <A>() => Schedule<readonly [void, Chunk<A>], never, A, Chunk<A>>;
```

### collectAllFrom

Returns a new schedule that collects the outputs of this one into a chunk.

```ts
export declare const collectAllFrom: <State, Env, In, Out>(self: Schedule<State, Env, In, Out>) => Schedule<readonly [State, Chunk<Out>], Env, In, Chunk<Out>>;
```

### collectUntil

A schedule that recurs until the condition f fails, collecting all inputs
into a list.

```ts
export declare const collectUntil: <A>(f: Predicate<A>) => Schedule<readonly [void, Chunk<A>], never, A, Chunk<A>>;
```

### collectUntilEffect

A schedule that recurs until the effectful condition f fails, collecting
all inputs into a list.

```ts
export declare const collectUntilEffect: <Env, A>(f: (a: A) => Effect<Env, never, boolean>) => Schedule<readonly [void, Chunk<A>], Env, A, Chunk<A>>;
```

### collectWhile

A schedule that recurs as long as the condition f holds, collecting all
inputs into a list.

```ts
export declare const collectWhile: <A>(f: Predicate<A>) => Schedule<readonly [void, Chunk<A>], never, A, Chunk<A>>;
```

### collectWhileEffect

A schedule that recurs as long as the effectful condition holds, collecting
all inputs into a list.

```ts
export declare const collectWhileEffect: <Env, A>(f: (a: A) => Effect<Env, never, boolean>) => Schedule<readonly [void, Chunk<A>], Env, A, Chunk<A>>;
```

### compose

Returns the composition of this schedule and the specified schedule, by
piping the output of this one into the input of the other. Effects
described by this schedule will always be executed before the effects
described by the second schedule.

```ts
export declare const compose: <Out, State1, Env1, Out2>(that: Schedule<State1, Env1, Out, Out2>) => <State, Env_1, In>(self: Schedule<State, Env_1, In, Out>) => Schedule<readonly [State, State1], Env1 | Env_1, In, Out2>;
```

### composeUsing

A backwards version of `compose`.

```ts
export declare const composeUsing: <State1, Env1, In2, In>(that: Schedule<State1, Env1, In2, In>) => <State, Env_1, Out>(self: Schedule<State, Env_1, In, Out>) => Schedule<readonly [State1, State], Env1 | Env_1, In2, Out>;
```

### continue

```ts
export declare const continue: (intervals: Intervals) => Decision;
```

### continueWith

```ts
export declare const continueWith: (interval: Interval) => Decision;
```

### contramap

Returns a new schedule that deals with a narrower class of inputs than this
schedule.

```ts
export declare const contramap: <In, In2>(f: (in2: In2) => In) => <State, Env_1, Out>(self: Schedule<State, Env_1, In, Out>) => Schedule<State, Env_1, In2, Out>;
```

### contramapEffect

Returns a new schedule that deals with a narrower class of inputs than this
schedule.

```ts
export declare const contramapEffect: <In, Env1, In2>(f: (in2: In2) => Effect<Env1, never, In>) => <State, Env_1, Out>(self: Schedule<State, Env_1, In, Out>) => Schedule<State, Env1 | Env_1, In2, Out>;
```

### count

A schedule that always recurs, which counts the number of recurrences.

```ts
export declare const count: Schedule<number, never, unknown, number>;
```

### dayOfMonth

Cron-like schedule that recurs every specified `day` of month. Won't recur
on months containing less days than specified in `day` param.

It triggers at zero hour of the day. Producing a count of repeats: 0, 1, 2.

NOTE: `day` parameter is validated lazily. Must be in range 1...31.

```ts
export declare const dayOfMonth: (day: number) => Schedule<readonly [number, number], never, unknown, number>;
```

### dayOfWeek

Cron-like schedule that recurs every specified `day` of each week. It
triggers at zero hour of the week. Producing a count of repeats: 0, 1, 2.

NOTE: `day` parameter is validated lazily. Must be in range 1 (Monday)...7
(Sunday).

```ts
export declare const dayOfWeek: (day: number) => Schedule<readonly [number, number], never, unknown, number>;
```

### delayed

Returns a new schedule with the specified effectfully computed delay added
before the start of each interval produced by this schedule.

```ts
export declare const delayed: (f: (duration: Duration) => Duration) => <State, Env_1, In, Out>(self: Schedule<State, Env_1, In, Out>) => Schedule<State, Env_1, In, Out>;
```

### delayedEffect

Returns a new schedule with the specified effectfully computed delay added
before the start of each interval produced by this schedule.

```ts
export declare const delayedEffect: <Env1>(f: (duration: Duration) => Effect<Env1, never, Duration>) => <State, Env_1, In, Out>(self: Schedule<State, Env_1, In, Out>) => Schedule<State, Env1 | Env_1, In, Out>;
```

### delayedUsing

Takes a schedule that produces a delay, and returns a new schedule that
uses this delay to further delay intervals in the resulting schedule.

```ts
export declare const delayedUsing: <State, Env, In>(schedule: Schedule<State, Env, In, Duration>) => Schedule<State, Env, In, Duration>;
```

### delays

Returns a new schedule that outputs the delay between each occurence.

```ts
export declare const delays: <State, Env, In, Out>(self: Schedule<State, Env, In, Out>) => Schedule<State, Env, In, Duration>;
```

### dimap

Returns a new schedule that contramaps the input and maps the output.

```ts
export declare const dimap: <In, Out, In2, Out2>(f: (in2: In2) => In, g: (out: Out) => Out2) => <State, Env_1>(self: Schedule<State, Env_1, In, Out>) => Schedule<State, Env_1, In2, Out2>;
```

### dimapEffect

Returns a new schedule that contramaps the input and maps the output.

```ts
export declare const dimapEffect: <In, Out, Env1, Env2, In2, Out2>(f: (in2: In2) => Effect<Env1, never, In>, g: (out: Out) => Effect<Env2, never, Out2>) => <State, Env_1>(self: Schedule<State, Env_1, In, Out>) => Schedule<State, Env1 | Env2 | Env_1, In2, Out2>;
```

### done

```ts
export declare const done: Decision;
```

### driver

Returns a driver that can be used to step the schedule, appropriately
handling sleeping.

```ts
export declare const driver: <State, Env, In, Out>(self: Schedule<State, Env, In, Out>) => Effect<never, never, Driver<State, Env, In, Out>>;
```

### duration

A schedule that can recur one time, the specified amount of time into the
future.

```ts
export declare const duration: (duration: Duration) => Schedule<boolean, never, unknown, Duration>;
```

### either

Returns a new schedule that performs a geometric union on the intervals
defined by both schedules.

```ts
export declare const either: <State1, Env1, In1, Out2>(that: Schedule<State1, Env1, In1, Out2>) => <State, Env_1, In, Out>(self: Schedule<State, Env_1, In, Out>) => Schedule<readonly [State, State1], Env1 | Env_1, In & In1, readonly [Out, Out2]>;
```

### eitherWith

The same as `either` followed by `map`.

```ts
export declare const eitherWith: <State1, Env1, In1, Out2, Out, Out3>(that: Schedule<State1, Env1, In1, Out2>, f: (out: Out, out2: Out2) => Out3) => <State, Env_1, In>(self: Schedule<State, Env_1, In, Out>) => Schedule<readonly [State, State1], Env1 | Env_1, In & In1, Out3>;
```

### elapsed

A schedule that occurs everywhere, which returns the total elapsed duration
since the first step.

```ts
export declare const elapsed: Schedule<Maybe<number>, never, unknown, Duration>;
```

### ensuring

Returns a new schedule that will run the specified finalizer as soon as the
schedule is complete. Note that unlike `Effect.ensuring`, this method does not
guarantee the finalizer will be run. The `Schedule` may not initialize or
the driver of the schedule may not run to completion. However, if the
`Schedule` ever decides not to continue, then the finalizer will be run.

```ts
export declare const ensuring: <X>(finalizer: Effect<never, never, X>) => <State, Env_1, In, Out>(self: Schedule<State, Env_1, In, Out>) => Schedule<State, Env_1, In, Out>;
```

### exponential

A schedule that always recurs, but will wait a certain amount between
repetitions, given by `base * factor.pow(n)`, where `n` is the number of
repetitions so far. Returns the current duration between recurrences.

```ts
export declare const exponential: (base: Duration, factor?: number) => Schedule<number, never, unknown, Duration>;
```

### fibonacci

A schedule that always recurs, increasing delays by summing the preceding
two delays (similar to the fibonacci sequence). Returns the current
duration between recurrences.

```ts
export declare const fibonacci: (one: Duration) => Schedule<readonly [Duration, Duration], never, unknown, Duration>;
```

### first

Returns a new schedule that packs the input and output of this schedule
into the first element of a tuple. This allows carrying information through
this schedule.

```ts
export declare const first: <State, Env, In, Out, X>(self: Schedule<State, Env, In, Out>) => Schedule<readonly [State, void], Env, readonly [In, X], readonly [Out, X]>;
```

### fixed

A schedule that recurs on a fixed interval. Returns the number of
repetitions of the schedule so far.

If the action run between updates takes longer than the interval, then the
action will be run immediately, but re-runs will not "pile up".

```text
|-----interval-----|-----interval-----|-----interval-----|
|---------action--------||action|-----|action|-----------|
```

```ts
export declare const fixed: (interval: Duration) => Schedule<readonly [Maybe<readonly [number, number]>, number], never, unknown, number>;
```

### fold

Returns a new schedule that folds over the outputs of this one.

```ts
export declare const fold: <Out, Z>(z: Z, f: (z: Z, out: Out) => Z) => <State, Env_1, In>(self: Schedule<State, Env_1, In, Out>) => Schedule<readonly [State, Z], Env_1, In, Z>;
```

### foldEffect

Returns a new schedule that effectfully folds over the outputs of this one.

```ts
export declare const foldEffect: <Out, Env1, Z>(z: Z, f: (z: Z, out: Out) => Effect<Env1, never, Z>) => <State, Env_1, In>(self: Schedule<State, Env_1, In, Out>) => Schedule<readonly [State, Z], Env1 | Env_1, In, Z>;
```

### forever

Returns a new schedule that loops this one continuously, resetting the
state when this schedule is done.

```ts
export declare const forever: <State, Env, In, Out>(self: Schedule<State, Env, In, Out>) => Schedule<State, Env, In, Out>;
```

### fromDuration

A schedule that recurs once with the specified delay.

```ts
export declare const fromDuration: (duration: Duration) => Schedule<boolean, never, unknown, Duration>;
```

### fromDurations

A schedule that recurs once for each of the specified durations, delaying
each time for the length of the specified duration. Returns the length of
the current duration between recurrences.

```ts
export declare const fromDurations: (duration: Duration, ...durations: Duration[]) => Schedule<readonly [Chunk<Duration>, boolean], never, unknown, Duration>;
```

### fromFunction

A schedule that always recurs, mapping input values through the specified
function.

```ts
export declare const fromFunction: <A, B>(f: (a: A) => B) => Schedule<void, never, A, B>;
```

### hourOfDay

Cron-like schedule that recurs every specified `hour` of each day. It
triggers at zero minute of the hour. Producing a count of repeats: 0, 1, 2.

NOTE: `hour` parameter is validated lazily. Must be in range 0...23.

```ts
export declare const hourOfDay: (hour: number) => Schedule<readonly [number, number], never, unknown, number>;
```

### identity

A schedule that always recurs, which returns inputs as outputs.

```ts
export declare const identity: <A>() => Schedule<void, never, A, A>;
```

### intersect

Returns a new schedule that performs a geometric intersection on the
intervals defined by both schedules.

```ts
export declare const intersect: <State1, Env1, In1, Out2>(that: Schedule<State1, Env1, In1, Out2>) => <State, Env_1, In, Out>(self: Schedule<State, Env_1, In, Out>) => Schedule<readonly [State, State1], Env1 | Env_1, In & In1, readonly [Out, Out2]>;
```

### intersectWith

Returns a new schedule that combines this schedule with the specified
schedule, continuing as long as both schedules want to continue and merging
the next intervals according to the specified merge function.

```ts
export declare const intersectWith: <State1, Env1, In1, Out2>(that: Schedule<State1, Env1, In1, Out2>, f: (x: Intervals, y: Intervals) => Intervals) => <State, Env_1, In, Out>(self: Schedule<State, Env_1, In, Out>) => Schedule<readonly [State, State1], Env1 | Env_1, In & In1, readonly [Out, Out2]>;
```

### jittered

Returns a new schedule that randomly modifies the size of the intervals of
this schedule.

The new interval size is between `min * old interval size` and `max * old
interval size`.

```ts
export declare const jittered: (min: number, max: number) => <State, Env_1, In, Out>(self: Schedule<State, Env_1, In, Out>) => Schedule<State, Random | Env_1, In, Out>;
```

### jitteredDefault

Returns a new schedule that randomly modifies the size of the intervals of
this schedule.

The new interval size is between `min * old interval size` and `max * old
interval size`.

```ts
export declare const jitteredDefault: <State, Env, In, Out>(self: Schedule<State, Env, In, Out>) => Schedule<State, Random | Env, In, Out>;
```

### left

Returns a new schedule that makes this schedule available on the `Left`
side of an `Either` input, allowing propagating some type `X` through this
channel on demand.

```ts
export declare const left: <State, Env, In, Out, X>(self: Schedule<State, Env, In, Out>) => Schedule<readonly [State, void], Env, Either<In, X>, Either<Out, X>>;
```

### linear

A schedule that always recurs, but will repeat on a linear time interval,
given by `base * n` where `n` is the number of repetitions so far. Returns
the current duration between recurrences.

```ts
export declare const linear: (base: Duration) => Schedule<number, never, unknown, Duration>;
```

### make

```ts
export declare const make: <State, Env, In, Out>(next: (input: In) => Effect<Env, Maybe<never>, Out>, last: Effect<never, NoSuchElement, Out>, reset: Effect<never, never, void>, state: Effect<never, never, State>) => Driver<State, Env, In, Out>;
```

### map

Returns a new schedule that maps the output of this schedule through the
specified function.

```ts
export declare const map: <Out, Out2>(f: (out: Out) => Out2) => <State, Env_1, In>(self: Schedule<State, Env_1, In, Out>) => Schedule<State, Env_1, In, Out2>;
```

### mapEffect

Returns a new schedule that maps the output of this schedule through the
specified effectful function.

```ts
export declare const mapEffect: <Out, Env1, Out2>(f: (out: Out) => Effect<Env1, never, Out2>) => <State, Env_1, In>(self: Schedule<State, Env_1, In, Out>) => Schedule<State, Env1 | Env_1, In, Out2>;
```

### minuteOfHour

Cron-like schedule that recurs every specified `minute` of each hour. It
triggers at zero second of the minute. Producing a count of repeats: 0, 1,
2.

NOTE: `minute` parameter is validated lazily. Must be in range 0...59.

```ts
export declare const minuteOfHour: (minute: number) => Schedule<readonly [number, number], never, unknown, number>;
```

### modifyDelay

Returns a new schedule that modifies the delay using the specified
function.

```ts
export declare const modifyDelay: <Out>(f: (out: Out, duration: Duration) => Duration) => <State, Env_1, In>(self: Schedule<State, Env_1, In, Out>) => Schedule<State, Env_1, In, Out>;
```

### modifyDelayEffect

Returns a new schedule that modifies the delay using the specified
effectual function.

```ts
export declare const modifyDelayEffect: <Out, Env1>(f: (out: Out, duration: Duration) => Effect<Env1, never, Duration>) => <State, Env_1, In>(self: Schedule<State, Env_1, In, Out>) => Schedule<State, Env1 | Env_1, In, Out>;
```

### onDecision

Returns a new schedule that applies the current one but runs the specified
effect for every decision of this schedule. This can be used to create
schedules that log failures, decisions, or computed values.

```ts
export declare const onDecision: <State, Out, Env1, X>(f: (state: State, out: Out, decision: Decision) => Effect<Env1, never, X>) => <Env_1, In>(self: Schedule<State, Env_1, In, Out>) => Schedule<State, Env1 | Env_1, In, Out>;
```

### once

A schedule that recurs one time.

```ts
export declare const once: Schedule<number, never, unknown, void>;
```

### passthrough

Returns a new schedule that passes through the inputs of this schedule.

```ts
export declare const passthrough: <State, Env, Input, Output>(self: Schedule<State, Env, Input, Output>) => Schedule<State, Env, Input, Input>;
```

### provideEnvironment

Returns a new schedule with its environment provided to it, so the
resulting schedule does not require any environment.

```ts
export declare const provideEnvironment: <R>(environment: Env<R>) => <State, In, Out>(self: Schedule<State, R, In, Out>) => Schedule<State, never, In, Out>;
```

### provideService

Returns a new schedule with the single service it requires provided to it.
If the schedule requires multiple services use `provideEnvironment`
instead.

```ts
export declare const provideService: <T, T1 extends T>(tag: Tag<T>, service: T1) => <State, R, In, Out>(self: Schedule<State, T | R, In, Out>) => Schedule<State, Exclude<R, T>, In, Out>;
```

### provideSomeEnvironment

Transforms the environment being provided to this schedule with the
specified function.

```ts
export declare const provideSomeEnvironment: <R0, R>(f: (env0: Env<R0>) => Env<R>) => <State, In, Out>(self: Schedule<State, R, In, Out>) => Schedule<State, R0, In, Out>;
```

### reconsider

Returns a new schedule that reconsiders every decision made by this
schedule, possibly modifying the next interval and the output type in the
process.

```ts
export declare const reconsider: <State, Out, Out2>(f: (state: State, out: Out, decision: Decision) => Either<Out2, readonly [Out2, Interval]>) => <Env_1, In>(self: Schedule<State, Env_1, In, Out>) => Schedule<State, Env_1, In, Out2>;
```

### reconsiderEffect

Returns a new schedule that effectfully reconsiders every decision made by
this schedule, possibly modifying the next interval and the output type in
the process.

```ts
export declare const reconsiderEffect: <State, Out, Env1, Out2>(f: (state: State, out: Out, decision: Decision) => Effect<Env1, never, Either<Out2, readonly [Out2, Interval]>>) => <Env_1, In>(self: Schedule<State, Env_1, In, Out>) => Schedule<State, Env1 | Env_1, In, Out2>;
```

### recurUntil

A schedule that recurs for until the predicate evaluates to true.

```ts
export declare const recurUntil: <A>(f: Predicate<A>) => Schedule<void, never, A, A>;
```

### recurUntilEffect

A schedule that recurs for until the predicate evaluates to true.

```ts
export declare const recurUntilEffect: <Env, A>(f: (a: A) => Effect<Env, never, boolean>) => Schedule<void, Env, A, A>;
```

### recurUntilEquals

A schedule that recurs for until the predicate is equal.

```ts
export declare const recurUntilEquals: <A>(E: Equivalence<A>, value: A) => Schedule<void, never, A, A>;
```

### recurUntilMaybe

A schedule that recurs for until the input value becomes applicable to
partial function and then map that value with given function.

```ts
export declare const recurUntilMaybe: <A, B>(pf: (a: A) => Maybe<B>) => Schedule<void, never, A, Maybe<B>>;
```

### recurUpTo

A schedule that recurs during the given duration.

```ts
export declare const recurUpTo: (duration: Duration) => Schedule<Maybe<number>, never, unknown, Duration>;
```

### recurWhile

A schedule that recurs for as long as the predicate evaluates to true.

```ts
export declare const recurWhile: <A>(f: Predicate<A>) => Schedule<void, never, A, A>;
```

### recurWhileEffect

A schedule that recurs for as long as the effectful predicate evaluates to
true.

```ts
export declare const recurWhileEffect: <Env, A>(f: (a: A) => Effect<Env, never, boolean>) => Schedule<void, Env, A, A>;
```

### recurWhileEquals

A schedule that recurs for as long as the predicate is equal to the
specified value.

```ts
export declare const recurWhileEquals: <A>(E: Equivalence<A>, value: A) => Schedule<void, never, A, A>;
```

### recurs

A schedule spanning all time, which can be stepped only the specified
number of times before it terminates.

```ts
export declare const recurs: (n: number) => Schedule<number, never, unknown, number>;
```

### repeatForever

A schedule that always recurs, producing a count of repeats: 0, 1, 2.

```ts
export declare const repeatForever: Schedule<number, never, unknown, number>;
```

### repetitions

Returns a new schedule that outputs the number of repetitions of this one.

```ts
export declare const repetitions: <State, Env, In, Out>(self: Schedule<State, Env, In, Out>) => Schedule<readonly [State, number], Env, In, number>;
```

### resetAfter

Return a new schedule that automatically resets the schedule to its initial
state after some time of inactivity defined by `duration`.

```ts
export declare const resetAfter: (duration: Duration) => <State, Env_1, In, Out>(self: Schedule<State, Env_1, In, Out>) => Schedule<readonly [State, Maybe<number>], Env_1, In, Out>;
```

### resetWhen

Resets the schedule when the specified predicate on the schedule output
evaluates to true.

```ts
export declare const resetWhen: <Out>(f: Predicate<Out>) => <State, Env_1, In>(self: Schedule<State, Env_1, In, Out>) => Schedule<State, Env_1, In, Out>;
```

### right

Returns a new schedule that makes this schedule available on the `Right`
side of an `Either` input, allowing propagating some type `X` through this
channel on demand.

```ts
export declare const right: <State, Env, In, Out, X>(self: Schedule<State, Env, In, Out>) => Schedule<readonly [void, State], Env, Either<X, In>, Either<X, Out>>;
```

### run

Runs a schedule using the provided inputs, and collects all outputs.

```ts
export declare const run: <In>(now: number, input: Collection<In>) => <State, Env_1, Out>(self: Schedule<State, Env_1, In, Out>) => Effect<Env_1, never, Chunk<Out>>;
```

### second

Returns a new schedule that packs the input and output of this schedule
into the second element of a tuple. This allows carrying information
through this schedule.

```ts
export declare const second: <State, Env, In, Out, X>(self: Schedule<State, Env, In, Out>) => Schedule<readonly [void, State], Env, readonly [X, In], readonly [X, Out]>;
```

### secondOfMinute

Cron-like schedule that recurs every specified `second` of each minute. It
triggers at zero nanosecond of the second. Producing a count of repeats: 0,
1, 2.

NOTE: `second` parameter is validated lazily. Must be in range 0...59.

```ts
export declare const secondOfMinute: (second: number) => Schedule<readonly [number, number], never, unknown, number>;
```

### spaced

Returns a schedule that recurs continuously, each repetition spaced the
specified duration from the last run.

```ts
export declare const spaced: (duration: Duration) => Schedule<number, never, unknown, number>;
```

### stop

A schedule that does not recur, it just stops.

```ts
export declare const stop: Schedule<number, never, unknown, void>;
```

### succeed

Returns a schedule that repeats one time, producing the specified constant
value.

```ts
export declare const succeed: <A>(a: A) => Schedule<number, never, unknown, A>;
```

### sync

Returns a schedule that repeats one time, producing the specified constant
value.

```ts
export declare const sync: <A>(a: LazyArg<A>) => Schedule<number, never, unknown, A>;
```

### tapInput

Returns a new schedule that effectfully processes every input to this
schedule.

```ts
export declare const tapInput: <Env1, In1, X>(f: (in1: In1) => Effect<Env1, never, X>) => <State, Env_1, In, Out>(self: Schedule<State, Env_1, In, Out>) => Schedule<State, Env1 | Env_1, In & In1, Out>;
```

### tapOutput

Returns a new schedule that effectfully processes every output from this
schedule.

```ts
export declare const tapOutput: <Out, Env1, X>(f: (out: Out) => Effect<Env1, never, X>) => <State, Env_1, In>(self: Schedule<State, Env_1, In, Out>) => Schedule<State, Env1 | Env_1, In, Out>;
```

### unfold

Unfolds a schedule that repeats one time from the specified state and
iterator.

```ts
export declare const unfold: <A>(initial: A, f: (a: A) => A) => Schedule<A, never, unknown, A>;
```

### union

Returns a new schedule that performs a geometric union on the intervals
defined by both schedules.

```ts
export declare const union: <State1, Env1, In1, Out2>(that: Schedule<State1, Env1, In1, Out2>) => <State, Env_1, In, Out>(self: Schedule<State, Env_1, In, Out>) => Schedule<readonly [State, State1], Env1 | Env_1, In & In1, readonly [Out, Out2]>;
```

### unionWith

Returns a new schedule that combines this schedule with the specified
schedule, continuing as long as either schedule wants to continue and
merging the next intervals according to the specified merge function.

```ts
export declare const unionWith: <State1, Env1, In1, Out2>(that: Schedule<State1, Env1, In1, Out2>, f: (x: Intervals, y: Intervals) => Intervals) => <State, Env_1, In, Out>(self: Schedule<State, Env_1, In, Out>) => Schedule<readonly [State, State1], Env1 | Env_1, In & In1, readonly [Out, Out2]>;
```

### unit

Returns a new schedule that maps the output of this schedule to unit.

```ts
export declare const unit: <State, Env, In, Out>(self: Schedule<State, Env, In, Out>) => Schedule<State, Env, In, void>;
```

### untilInput

Returns a new schedule that continues until the specified predicate on the
input evaluates to true.

```ts
export declare const untilInput: <In>(f: Predicate<In>) => <State, Env_1, Out>(self: Schedule<State, Env_1, In, Out>) => Schedule<State, Env_1, In, Out>;
```

### untilInputEffect

Returns a new schedule that continues until the specified effectful
predicate on the input evaluates to true.

```ts
export declare const untilInputEffect: <In, Env1>(f: (input: In) => Effect<Env1, never, boolean>) => <State, Env_1, Out>(self: Schedule<State, Env_1, In, Out>) => Schedule<State, Env1 | Env_1, In, Out>;
```

### untilOutput

Returns a new schedule that continues until the specified predicate on the
output evaluates to true.

```ts
export declare const untilOutput: <Out>(f: Predicate<Out>) => <State, Env_1, In>(self: Schedule<State, Env_1, In, Out>) => Schedule<State, Env_1, In, Out>;
```

### untilOutputEffect

Returns a new schedule that continues until the specified effectful
predicate on the output evaluates to true.

```ts
export declare const untilOutputEffect: <Out, Env1>(f: (out: Out) => Effect<Env1, never, boolean>) => <State, Env_1, In>(self: Schedule<State, Env_1, In, Out>) => Schedule<State, Env1 | Env_1, In, Out>;
```

### upTo

A schedule that recurs during the given duration.

```ts
export declare const upTo: (duration: Duration) => <State, Env_1, In, Out>(self: Schedule<State, Env_1, In, Out>) => Schedule<readonly [State, Maybe<number>], Env_1, In, Out>;
```

### whileInput

Returns a new schedule that continues for as long the specified predicate
on the input evaluates to true.

```ts
export declare const whileInput: <In>(f: Predicate<In>) => <State, Env_1, Out>(self: Schedule<State, Env_1, In, Out>) => Schedule<State, Env_1, In, Out>;
```

### whileInputEffect

Returns a new schedule that continues for as long the specified effectful
predicate on the input evaluates to true.

```ts
export declare const whileInputEffect: <In, Env1>(f: (input: In) => Effect<Env1, never, boolean>) => <State, Env_1, Out>(self: Schedule<State, Env_1, In, Out>) => Schedule<State, Env1 | Env_1, In, Out>;
```

### whileOutput

Returns a new schedule that continues for as long the specified predicate
on the output evaluates to true.

```ts
export declare const whileOutput: <Out>(f: Predicate<Out>) => <State, Env_1, In>(self: Schedule<State, Env_1, In, Out>) => Schedule<State, Env_1, In, Out>;
```

### whileOutputEffect

Returns a new schedule that continues for as long the specified effectful
predicate on the output evaluates to true.

```ts
export declare const whileOutputEffect: <Out, Env1>(f: (out: Out) => Effect<Env1, never, boolean>) => <State, Env_1, In>(self: Schedule<State, Env_1, In, Out>) => Schedule<State, Env1 | Env_1, In, Out>;
```

### windowed

A schedule that divides the timeline to `interval`-long windows, and sleeps
until the nearest window boundary every time it recurs.

For example, `windowed(Duration.seconds(10))` would produce a schedule as
follows:

```text
     10s        10s        10s       10s
|----------|----------|----------|----------|
|action------|sleep---|act|-sleep|action----|
```

```ts
export declare const windowed: (interval: Duration) => Schedule<readonly [Maybe<number>, number], never, unknown, number>;
```

### zipLeft

The same as `intersect` but ignores the right output.

```ts
export declare const zipLeft: <State1, Env1, In1, Out2>(that: Schedule<State1, Env1, In1, Out2>) => <State, Env_1, In, Out>(self: Schedule<State, Env_1, In, Out>) => Schedule<readonly [State, State1], Env1 | Env_1, In & In1, Out>;
```

### zipRight

The same as `intersect` but ignores the left output.

```ts
export declare const zipRight: <State1, Env1, In1, Out2>(that: Schedule<State1, Env1, In1, Out2>) => <State, Env_1, In, Out>(self: Schedule<State, Env_1, In, Out>) => Schedule<readonly [State, State1], Env1 | Env_1, In & In1, Out2>;
```

### zipWith

Equivalent to `zip` followed by `map`.

```ts
export declare const zipWith: <State1, Env1, In1, Out2, Out, Out3>(that: Schedule<State1, Env1, In1, Out2>, f: (out: Out, out2: Out2) => Out3) => <State, Env_1, In>(self: Schedule<State, Env_1, In, Out>) => Schedule<readonly [State, State1], Env1 | Env_1, In & In1, Out3>;
```

