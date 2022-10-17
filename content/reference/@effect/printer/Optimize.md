## Optimize

Reference Documentation for the module '@effect/printer/Optimize'

Represents optimization of a given document tree through fusion of redundant
document nodes.

```ts
export interface Optimize<A> {
    (depth: Optimize.Depth): Doc<A>;
}
```

## General API

### optimize

The `optimize` function will combine text nodes so that they can be rendered
more efficiently. An optimized document is always laid out in an identical
manner to its un-optimized counterpart.

When laying a `Doc` out to a `SimpleDocStream`, every component of the input
document is translated directly to the simpler output format. This sometimes
yields undesirable chunking when many pieces have been concatenated together.

It is therefore a good idea to run `fuse` on concatenations of lots of small
strings that are used many times.

```typescript
import * as D from "../src/Core/Doc"

// The document below contains a chain of four entries in the output
// `DocStream`
const doc1 = D.hsepT(D.char("a"), D.char("b"), D.char("c"), D.char("d"))

// but is fully equivalent to the tightly packed document below which is only
// a single entry in the output `DocStream` and can be processed much more
// efficiently.
const doc2 = D.text("abcd")
```

```ts
export declare const optimize: <A>(depth: FusionDepth) => (self: Doc<A>) => Doc<A>;
```

### unifyOptimize

```ts
export declare const unifyOptimize: <X extends Optimize<any>>(self: X) => Optimize<[X] extends [Optimize<infer AX>] ? AX : never>;
```

