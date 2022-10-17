import * as _STM from '@effect/core/stm/STM'
import * as _TArray from '@effect/core/stm/TArray'
import * as _TDeferred from '@effect/core/stm/TDeferred'
import * as _TExit from '@effect/core/stm/TExit'
import * as _THub from '@effect/core/stm/THub'
import * as _TMap from '@effect/core/stm/TMap'
import * as _TPriorityQueue from '@effect/core/stm/TPriorityQueue'
import * as _TQueue from '@effect/core/stm/TQueue'
import * as _TRandom from '@effect/core/stm/TRandom'
import * as _TReentrantLock from '@effect/core/stm/TReentrantLock'
import * as _TRef from '@effect/core/stm/TRef'
import * as _TSemaphore from '@effect/core/stm/TSemaphore'
import * as _TSet from '@effect/core/stm/TSet'

const STM: Omit<typeof _STM, never> = _STM
const TArray: Omit<typeof _TArray, never> = _TArray
const TDeferred: Omit<typeof _TDeferred, never> = _TDeferred
const TExit: Omit<typeof _TExit, never> = _TExit
const THub: Omit<typeof _THub, never> = _THub
const TMap: Omit<typeof _TMap, never> = _TMap
const TPriorityQueue: Omit<typeof _TPriorityQueue, never> = _TPriorityQueue
const TQueue: Omit<typeof _TQueue, never> = _TQueue
const TRandom: Omit<typeof _TRandom, never> = _TRandom
const TReentrantLock: Omit<typeof _TReentrantLock, never> = _TReentrantLock
const TRef: Omit<typeof _TRef, never> = _TRef
const TSemaphore: Omit<typeof _TSemaphore, never> = _TSemaphore
const TSet: Omit<typeof _TSet, never> = _TSet

export type STM<R, E, A> = _STM.STM<R, E, A>
export type TArray<A> = _TArray.TArray<A>
export type TDeferred<E, A> = _TDeferred.TDeferred<E, A>
export type TExit<E, A> = _TExit.TExit<E, A>
export type THub<A> = _THub.THub<A>
export type TMap<K, V> = _TMap.TMap<K, V>
export type TPriorityQueue<A> = _TPriorityQueue.TPriorityQueue<A>
export type TQueue<A> = _TQueue.TQueue<A>
export type TRandom = _TRandom.TRandom
export type TReentrantLock = _TReentrantLock.TReentrantLock
export type TRef<A> = _TRef.TRef<A>
export type TSemaphore = _TSemaphore.TSemaphore
export type TSet<A> = _TSet.TSet<A>

export {
  STM,
  TArray,
  TDeferred,
  TExit,
  THub,
  TMap,
  TPriorityQueue,
  TQueue,
  TRandom,
  TReentrantLock,
  TRef,
  TSemaphore,
  TSet,
}
