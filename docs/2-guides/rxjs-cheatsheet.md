# RxJS Cheatsheet

For people coming from RxJS to Effect the following table of "equivalent" abstractions might be helpful.

| RxJS            | Effect             |
|-----------------|--------------------|
| `combineLatest` | `S.zipWithLatest`  |
| `switchMap`     | `S.chainParSwitch` |
| `startWith`     | `streamStartWith`  |


## Helpers

```ts
import * as Chunk from '@effect-ts/core/Collections/Immutable/Chunk'
import * as S from '@effect-ts/core/Effect/Experimental/Stream'

export const streamStartWith =
  <R, E, A>(...values: A[]) =>
  (stream: S.Stream<R, E, A>) =>
    S.merge_(stream, S.fromChunk(Chunk.from(values)))
```
