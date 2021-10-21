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
  Cause,
  Chunk,
  Effect,
  Exit,
  Managed,
  Option,
  pipe,
  Queue,
  Stream,
} from '@effect-ts/core';
import { materialize } from 'rxjs/operators';

type QueueTypes = 'sliding' | 'dropping' | 'bounded' | 'unbounded';

function getQueue<A>(
  type: QueueTypes,
  buffer: number,
): Effect.UIO<Queue.Queue<A>> {
  switch (type) {
    case 'bounded':
      return Queue.makeBounded<A>(buffer);
    case 'dropping':
      return Queue.makeDropping<A>(buffer);
    case 'sliding':
      return Queue.makeSliding<A>(buffer);
    case 'unbounded':
    default:
      return Queue.makeUnbounded<A>();
  }
}

export const fromObservable_ = <A>(
  o: Observable<A>,
  bufferType: QueueTypes = 'bounded',
  bufferSize = 16,
) =>
  Stream.unwrapManaged(
    Managed.gen(function* (_) {
      // you need a queue to hold the values
      const queue = yield* _(
        getQueue<Exit.Exit<Option.Option<never>, Chunk.Chunk<A>>>(
          bufferType,
          bufferSize,
        ),
      );

      // subscription
      const sub = yield* _(
        Managed.makeExit_(
          Effect.succeedWith(() =>
            o.pipe(materialize()).subscribe((notification) => {
              switch (notification.kind) {
                case 'C': {
                  Effect.runFiber(Queue.offer_(queue, Exit.fail(Option.none)));
                  break;
                }
                case 'E': {
                  Effect.runFiber(
                    Queue.offer_(queue, Exit.die(notification.error)),
                  );
                  break;
                }
                case 'N': {
                  Effect.runFiber(
                    Queue.offer_(
                      queue,
                      Exit.succeed(Chunk.single(notification.value as A)),
                    ),
                  );
                  break;
                }
              }
            }),
          ),
          (sub) => Effect.succeedWith(() => sub.unsubscribe()),
        ),
      );

      // stream is produced by pulling the queue
      return pipe(
        queue,
        Queue.take,
        Effect.onExit((e) =>
          Effect.succeedWith(() => {
            if (e._tag === 'Failure' && !Cause.interruptedOnly(e.cause)) {
              console.error(Cause.pretty(e.cause));
            }
          }),
        ),
        Effect.onInterrupt(() => Effect.succeedWith(() => sub.unsubscribe())),
        Effect.chain(Effect.done),
        Stream.repeatEffectChunkOption,
      );
    }),
  );

export const fromObservable =
  (bufferType: QueueTypes = 'bounded', bufferSize = 16) =>
  <A>(o: Observable<A>) =>
    fromObservable_(o, bufferType, bufferSize);
```

**fromStream**
```ts
import { Cause, Effect, Fiber, pipe, Stream } from '@effect-ts/core';
import { Observable, Subscriber, TeardownLogic } from 'rxjs';

export function runSubscriber_<E, A1, A2>(
  f: Effect.Effect<Effect.DefaultEnv, E, A2>,
  sub: Subscriber<A1>,
): TeardownLogic {
  const context = pipe(
    f,
    Effect.tapCause((cause) => {
      if (!Cause.interruptedOnly(cause)) {
        sub.error(Cause.pretty(cause));
      }
      
      sub.complete();

      return Effect.unit;
    }),
    Effect.runFiber,
  );

  return {
    unsubscribe: () => {
      Fiber.interruptAs(context.fiberId);
      sub.complete();
    },
  };
}

export const runSubscriber =
  <A1>(sub: Subscriber<A1>) =>
  <E, A2>(s: Effect.Effect<Effect.DefaultEnv, E, A2>) =>
    runSubscriber_(s, sub);

export function fromStream<E, A>(s: Stream.Stream<unknown, E, A>) {
  return new Observable(
    (subscriber: Subscriber<A>): TeardownLogic =>
      pipe(
        s,
        Stream.forEach((v) => Effect.succeedWith(() => subscriber.next(v))),
        runSubscriber(subscriber),
      ),
  );
}
```
