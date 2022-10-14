## Metrics

Reference Documentation for the module '@effect/core/io/Metrics'

### contramap

Returns a new metric that is powered by this one, but which accepts updates
of the specified new type, which must be transformable to the input type of
this metric.

```ts
/**
 * @tsplus static effect/core/io/Metrics/Metric.Aspects contramap
 * @tsplus pipeable effect/core/io/Metrics/Metric contramap
 */
export declare const contramap: <In, In2>(f: (input: In2) => In) => <Type, Out>(self: Metric<Type, In, Out>) => Metric<Type, In2, Out>;
```

### counter

A counter, which can be incremented by numbers.

```ts
/**
 * @tsplus static effect/core/io/Metrics/Metric.Ops counter
 */
export declare const counter: (name: string) => Counter<number>;
```

### frequency

A string histogram metric, which keeps track of the counts of different
strings.

```ts
/**
 * @tsplus static effect/core/io/Metrics/Metric.Ops frequency
 */
export declare const frequency: (name: string) => Frequency<string>;
```

### fromConst

Returns a new metric that is powered by this one, but which accepts updates
of any type, and translates them to updates with the specified constant
update value.

```ts
/**
 * @tsplus static effect/core/io/Metrics/Metric.Aspects fromConst
 * @tsplus pipeable effect/core/io/Metrics/Metric fromConst
 */
export declare const fromConst: <In>(input: LazyArg<In>) => <Type, Out>(self: Metric<Type, In, Out>) => Metric<Type, unknown, Out>;
```

### fromMetricKey

```ts
/**
 * @tsplus static effect/core/io/Metrics/Metric.Ops fromMetricKey
 */
export declare const fromMetricKey: <Type extends MetricKeyType<any, any>>(key: MetricKey<Type>) => Metric<Type, [Type] extends [{ [_In]: () => infer In; }] ? In : never, [Type] extends [{ [_Out]: () => infer Out; }] ? Out : never>;
```

### gauge

A gauge, which can be set to a value.

```ts
/**
 * @tsplus static effect/core/io/Metrics/Metric.Ops gauge
 */
export declare const gauge: (name: string) => Gauge<number>;
```

### histogram

A numeric histogram metric, which keeps track of the count of numbers that
fall in bins with the specified boundaries.

```ts
/**
 * @tsplus static effect/core/io/Metrics/Metric.Ops histogram
 */
export declare const histogram: (name: string, boundaries: HistogramBoundaries) => Metric<HistogramKey, number, HistogramState>;
```

### histogramBoundaries

```ts
/**
 * @tsplus static effect/core/io/Metrics/Metric.Ops Histogram
 */
export declare const histogramBoundaries: { readonly Boundaries: HistogramBoundariesOps; };
```

### increment

```ts
/**
 * @tsplus getter effect/core/io/Metrics/Metric increment
 */
export declare const increment: (self: Counter<number>) => Effect<never, never, void>;
```

### incrementBy

```ts
/**
 * @tsplus static effect/core/io/Metrics/Metric.Aspects incrementBy
 * @tsplus pipeable effect/core/io/Metrics/Metric incrementBy
 */
export declare const incrementBy: (amount: number) => (self: Counter<number>) => Effect<never, never, void>;
```

### map

Returns a new metric that is powered by this one, but which outputs a new
state type, determined by transforming the state type of this metric by the
specified function.

```ts
/**
 * @tsplus static effect/core/io/Metrics/Metric map
 * @tsplus pipeable effect/core/io/Metrics/Metric map
 */
export declare const map: <Out, Out2>(f: (out: Out) => Out2) => <Type, In>(self: Metric<Type, In, Out>) => Metric<Type, In, Out2>;
```

### mapType

```ts
/**
 * @tsplus static effect/core/io/Metrics/Metric.Aspects mapType
 * @tsplus pipeable effect/core/io/Metrics/Metric mapType
 */
export declare const mapType: <Type, Type2>(f: (type: Type) => Type2) => <In, Out>(self: Metric<Type, In, Out>) => Metric<Type2, In, Out>;
```

### metricAspects

```ts
/**
 * @tsplus static effect/core/io/Metrics/Metric.Ops $
 */
export declare const metricAspects: MetricAspects;
```

### metricRegistry

```ts
/**
 * @tsplus static effect/core/io/Metrics/Metric.Ops registry
 */
export declare const metricRegistry: MetricRegistry;
```

### set

```ts
/**
 * @tsplus static effect/core/io/Metrics/Metric.Aspects set
 * @tsplus pipeable effect/core/io/Metrics/Metric set
 */
export declare const set: <In>(value: In) => (self: Gauge<In>) => Effect<never, never, void>;
```

### succeed

Creates a metric that ignores input and produces constant output.

```ts
/**
 * @tsplus static effect/core/io/Metrics/Metric.Ops succeed
 */
export declare const succeed: <Out>(out: LazyArg<Out>) => Metric<void, unknown, Out>;
```

### summary

```ts
/**
 * @tsplus static effect/core/io/Metrics/Metric.Ops summary
 */
export declare const summary: (name: string, maxAge: Duration, maxSize: number, error: number, quantiles: Chunk<number>) => Summary<number>;
```

### summaryTimestamp

```ts
/**
 * @tsplus static effect/core/io/Metrics/Metric.Ops summaryTimestamp
 */
export declare const summaryTimestamp: (name: string, maxAge: Duration, maxSize: number, error: number, quantiles: Chunk<number>) => Summary<readonly [value: number, timestamp: number]>;
```

### tagged

Returns a new metric, which is identical in every way to this one, except
the specified tags have been added to the tags of this metric.

```ts
/**
 * @tsplus static effect/core/io/Metrics/Metric tagged
 * @tsplus pipeable effect/core/io/Metrics/Metric tagged
 */
export declare const tagged: <Type, In, Out>(key: string, value: string) => (self: Metric<Type, In, Out>) => Metric<Type, In, Out>;
```

### taggedWith

Returns a new metric, which is identical in every way to this one, except
dynamic tags are added based on the update values. Note that the metric
returned by this method does not return any useful information, due to the
dynamic nature of the added tags.

```ts
/**
 * @tsplus static effect/core/io/Metrics/Metric.Aspects taggedWith
 * @tsplus pipeable effect/core/io/Metrics/Metric taggedWith
 */
export declare const taggedWith: <In>(f: (input: In) => HashSet<MetricLabel>) => <Type, Out>(self: Metric<Type, In, Out>) => Metric<Type, In, void>;
```

### taggedWithLabelSet

Returns a new metric, which is identical in every way to this one, except
the specified tags have been added to the tags of this metric.

```ts
/**
 * @tsplus static effect/core/io/Metrics/Metric.Aspects taggedWithLabelSet
 * @tsplus pipeable effect/core/io/Metrics/Metric taggedWithLabelSet
 */
export declare const taggedWithLabelSet: (extraTags: HashSet<MetricLabel>) => <Type, In, Out>(self: Metric<Type, In, Out>) => Metric<Type, In, Out>;
```

### taggedWithLabels

Returns a new metric, which is identical in every way to this one, except
the specified tags have been added to the tags of this metric.

```ts
/**
 * @tsplus static effect/core/io/Metrics/Metric.Aspects taggedWithLabels
 * @tsplus pipeable effect/core/io/Metrics/Metric taggedWithLabels
 */
export declare const taggedWithLabels: <Type, In, Out>(extraTags: Collection<MetricLabel>) => (self: Metric<Type, In, Out>) => Metric<Type, In, Out>;
```

### timer

Creates a timer metric, based on a histogram, which keeps track of
durations in milliseconds. The unit of time will automatically be added to
the metric as a tag (i.e. `"time_unit: milliseconds"`).

```ts
/**
 * @tsplus static effect/core/io/Metrics/Metric.Ops timer
 */
export declare const timer: (name: string) => Metric<HistogramKey, Duration, HistogramState>;
```

### trackAll

Returns an aspect that will update this metric with the specified constant
value every time the aspect is applied to an effect, regardless of whether
that effect fails or succeeds.

```ts
/**
 * @tsplus static effect/core/io/Metrics/Metric.Aspects trackAll
 * @tsplus pipeable effect/core/io/Metrics/Metric trackAll
 */
export declare const trackAll: <In>(input: In) => <Type, Out>(self: Metric<Type, In, Out>) => <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>;
```

### trackDefect

Returns an aspect that will update this metric with the defects of the
effects that it is applied to.

```ts
/**
 * @tsplus getter effect/core/io/Metrics/Metric trackDefect
 */
export declare const trackDefect: <Type, Out>(self: Metric<Type, unknown, Out>) => <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>;
```

### trackDefectWith

Returns an aspect that will update this metric with the result of applying
the specified function to the defect throwables of the effects that the
aspect is applied to.

```ts
/**
 * @tsplus static effect/core/io/Metrics/Metric.Aspects trackDefectWith
 * @tsplus pipeable effect/core/io/Metrics/Metric trackDefectWith
 */
export declare const trackDefectWith: <In>(f: (defect: unknown) => In) => <Type, Out>(self: Metric<Type, In, Out>) => <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>;
```

### trackDuration

Returns an aspect that will update this metric with the duration that the
effect takes to execute. To call this method, the input type of the metric
must be `Duration`.

```ts
/**
 * @tsplus getter effect/core/io/Metrics/Metric trackDuration
 */
export declare const trackDuration: <Type, Out>(self: Metric<Type, Duration, Out>) => <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>;
```

### trackDurationWith

Returns an aspect that will update this metric with the duration that the
effect takes to execute. To call this method, you must supply a function
that can convert the `Duration` to the input type of this metric.

```ts
/**
 * @tsplus static effect/core/io/Metrics/Metric.Aspects trackDurationWith
 * @tsplus pipeable effect/core/io/Metrics/Metric trackDurationWith
 */
export declare const trackDurationWith: <In>(f: (duration: Duration) => In) => <Type, Out>(self: Metric<Type, In, Out>) => <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>;
```

### trackError

Returns an aspect that will update this metric with the failure value of
the effects that it is applied to.

```ts
/**
 * @tsplus getter effect/core/io/Metrics/Metric trackError
 */
export declare const trackError: <Type, In, Out>(self: Metric<Type, In, Out>) => <R, E extends In, A>(effect: Effect<R, E, A>) => Effect<R, E, A>;
```

### trackErrorWith

Returns an aspect that will update this metric with the result of applying
the specified function to the error value of the effects that the aspect is
applied to.

```ts
/**
 * @tsplus static effect/core/io/Metrics/Metric.Aspects trackErrorWith
 * @tsplus pipeable effect/core/io/Metrics/Metric trackErrorWith
 */
export declare const trackErrorWith: <In, In2>(f: (error: In2) => In) => <Type, Out>(self: Metric<Type, In, Out>) => <R, E extends In2, A>(effect: Effect<R, E, A>) => Effect<R, E, A>;
```

### trackSuccess

Returns an aspect that will update this metric with the success value of
the effects that it is applied to.

```ts
/**
 * @tsplus getter effect/core/io/Metrics/Metric trackSuccess
 */
export declare const trackSuccess: <Type, In, Out>(self: Metric<Type, In, Out>) => <R, E, A extends In>(effect: Effect<R, E, A>) => Effect<R, E, A>;
```

### trackSuccessWith

Returns an aspect that will update this metric with the result of applying
the specified function to the success value of the effects that the aspect is
applied to.

```ts
/**
 * @tsplus static effect/core/io/Metrics/Metric.Aspects trackSuccessWith
 * @tsplus pipeable effect/core/io/Metrics/Metric trackSuccessWith
 */
export declare const trackSuccessWith: <In, In2>(f: (value: In2) => In) => <Type, Out>(self: Metric<Type, In, Out>) => <R, E, A extends In2>(effect: Effect<R, E, A>) => Effect<R, E, A>;
```

### update

Updates the metric with the specified update message. For example, if the
metric were a counter, the update would increment the method by the
provided amount.

```ts
/**
 * @tsplus static effect/core/io/Metrics/Metric.Aspects update
 * @tsplus pipeable effect/core/io/Metrics/Metric update
 */
export declare const update: <In>(input: In) => <Type, Out>(self: Metric<Type, In, Out>) => Effect<never, never, void>;
```

### value

Retrieves a snapshot of the value of the metric at this moment in time.

```ts
/**
 * @tsplus getter effect/core/io/Metrics/Metric value
 */
export declare const value: <Type, In, Out>(self: Metric<Type, In, Out>) => Effect<never, never, Out>;
```

### withNow

```ts
/**
 * @tsplus getter effect/core/io/Metrics/Metric withNow
 */
export declare const withNow: <Type, In, Out>(self: Metric<Type, readonly [In, number], Out>) => Metric<Type, In, Out>;
```

### zip

```ts
/**
 * @tsplus static effect/core/io/Metrics/Metric.Aspects zip
 * @tsplus pipeable effect/core/io/Metrics/Metric zip
 */
export declare const zip: <Type2, In2, Out2>(that: Metric<Type2, In2, Out2>) => <Type, In, Out>(self: Metric<Type, In, Out>) => Metric<readonly [Type, Type2], readonly [In, In2], readonly [Out, Out2]>;
```

