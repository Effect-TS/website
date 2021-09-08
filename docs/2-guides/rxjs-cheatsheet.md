# RxJS Cheatsheet

For people coming from RxJS to Effect the following table of "equivalent" abstractions might be helpful.

| RxJS            | Effect             |
|-----------------|--------------------|
| `combineLatest` | `S.zipWithLatest`  |
| `switchMap`     | `S.chainParSwitch` |
| `startWith`     | `startWith`<sup>1</sup>  |

**Notes:**
  1. Userland helper, see Helpers.

## Helpers

**startWith**
```ts
import { Chunk as C, Stream as S } from '@effect-ts/core';

export const startWith =
  <R, E, A>(...values: A[]) =>
  <A1>(stream: S.Stream<R, E, A | A1>) =>
    S.merge_(stream, S.fromChunk(Chunk.from(values)))
```

**fromObservable**
```ts
import { Observable } from 'rxjs';
import {
  Chunk as C,
  Effect as T,
  Exit as E,
  Managed as M,
  Option as O,
  Queue as Q,
  Stream as S,
} from '@effect-ts/core';
import { materialize } from 'rxjs/operators';

type QueueTypes = 'sliding' | 'dropping' | 'bounded' | 'unbounded';

function makeQueue<A>(
  type: QueueTypes,
  buffer: number,
): T.UIO<Q.Queue<A>> {
  switch (type) {
    case 'bounded':
      return Q.makeBounded<A>(buffer);
    case 'dropping':
      return Q.makeDropping<A>(buffer);
    case 'sliding':
      return Q.makeSliding<A>(buffer);
    case 'unbounded':
    default:
      return Q.makeUnbounded<A>();
  }
}

export const fromObservable_ = <A>(
  o: Observable<A>,
  bufferType: QueueTypes = 'bounded',
  bufferSize = 16,
) =>
  S.unwrapManaged(
    M.gen(function* (_) {
      // you need a queue to hold the values
      const queue = yield* _(
        makeQueue<E.Exit<O.Option<never>, C.Chunk<A>>>(
          bufferType,
          bufferSize,
        ),
      );

      // subscription
      yield* _(
        M.makeExit_(
          T.succeedWith(() =>
            o.pipe(materialize()).subscribe((notification) => {
              switch (notification.kind) {
                case 'C': {
                  T.runFiber(Q.offer_(queue, E.fail(O.none)));
                  break;
                }
                case 'E': {
                  T.runFiber(
                    Q.offer_(queue, E.die(notification.error)),
                  );
                  break;
                }
                case 'N': {
                  T.runFiber(
                    Q.offer_(
                      queue,
                      E.succeed(C.single(notification.value as A)),
                    ),
                  );
                  break;
                }
              }
            }),
          ),
          (sub) => T.succeedWith(() => sub.unsubscribe()),
        ),
      );

      // stream is produced by pulling the queue
      return S.repeatEffectChunkOption(
        T.chain_(Q.take(queue), T.done),
      );
    }),
  );

export const fromObservable =
  (bufferType: QueueTypes = 'bounded', bufferSize = 16) =>
    <A>(o: Observable<A>) =>
      fromObservable_(o, bufferType, bufferSize);
```
