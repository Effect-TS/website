import * as S from '@effect/core/stream/Stream'
import * as SK from '@effect/core/stream/Sink'
import * as CH from '@effect/core/stream/Channel'
import * as GB from '@effect/core/stream/GroupBy'
import * as P from '@effect/core/stream/Pull'
import * as SBK from '@effect/core/stream/SortedByKey'
import * as SRef from '@effect/core/stream/SubscriptionRef'
import * as T from '@effect/core/stream/Take'

const Stream: Omit<typeof S, never> = S
const Sink: Omit<typeof SK, never> = SK
const Channel: Omit<typeof CH, never> = CH
const GroupBy: Omit<typeof GB, never> = GB
const Pull: Omit<typeof P, never> = P
const SortedByKey: Omit<typeof SBK, never> = SBK
const SubscriptionRef: Omit<typeof SRef, never> = SRef
const Take: Omit<typeof T, never> = T

export type Stream<R, E, A> = S.Stream<R, E, A>
export type Sink<R, E, In, L, Z> = SK.Sink<R, E, In, L, Z>
export type Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> = CH.Channel<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutDone
>
export type SubscriptionRef<A> = SRef.SubscriptionRef<A>
export type Take<E, A> = T.Take<E, A>
export type SortedByKey<R, E, K, A> = SBK.SortedByKey<R, E, K, A>
export type Pull<R, E, A> = P.Pull<R, E, A>
export type GroupBy<R, E, K, V, A> = GB.GroupBy<R, E, K, V, A>

export { Stream, Sink, Channel, GroupBy, Pull, SortedByKey, SubscriptionRef, Take }
