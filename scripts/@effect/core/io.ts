import * as E from '@effect/core/io/Effect'
import * as Q from '@effect/core/io/Queue'
import * as R from '@effect/core/io/Ref'
import * as C from '@effect/core/io/Cause'
import * as D from '@effect/core/io/Deferred'
import * as CA from '@effect/core/io/Cached'
import * as RL from '@effect/core/io/Reloadable'
import * as RN from '@effect/core/io/Runtime'
import * as CL from '@effect/core/io/Clock'
import * as RF from '@effect/core/io/RuntimeFlags'
import * as SCH from '@effect/core/io/Schedule'
import * as SCO from '@effect/core/io/Scope'
import * as SCR from '@effect/core/io/ScopedRef'
import * as SUP from '@effect/core/io/Supervisor'
import * as DS from '@effect/core/io/DefaultServices'
import * as EX from '@effect/core/io/Exit'
import * as FB from '@effect/core/io/Fiber'
import * as FID from '@effect/core/io/FiberId'
import * as FRE from '@effect/core/io/FiberRef'
import * as FSCO from '@effect/core/io/FiberScope'
import * as HB from '@effect/core/io/Hub'
import * as IS from '@effect/core/io/InterruptStatus'
import * as L from '@effect/core/io/Layer'
import * as LL from '@effect/core/io/LogLevel'
import * as LS from '@effect/core/io/LogSpan'
import * as LG from '@effect/core/io/Logger'
import * as ME from '@effect/core/io/Metrics'
import * as RND from '@effect/core/io/Random'

const Effect: Omit<typeof E, never> = E
const Metric: Omit<typeof ME, never> = ME
const Random: Omit<typeof RND, never> = RND
const Queue: Omit<typeof Q, `unsafeCreate` | `createQueue` | `${string}Strategy`> = Q
const Ref: Omit<typeof R, never> = R
const Cause: Omit<typeof C, never> = C
const Deferred: Omit<typeof D, never> = D
const Cached: Omit<typeof CA, never> = CA
const Clock: Omit<typeof CL, never> = CL
const Reloadable: Omit<typeof RL, never> = RL
const Runtime: Omit<typeof RN, never> = RN
const RuntimeFlags: Omit<typeof RF, never> = RF
const Schedule: Omit<typeof SCH, never> = SCH
const Scope: Omit<typeof SCO, never> = SCO
const ScopedRef: Omit<typeof SCR, never> = SCR
const Supervisor: Omit<typeof SUP, never> = SUP
const DefaultServices: Omit<typeof DS, never> = DS
const Exit: Omit<typeof EX, never> = EX
const Fiber: Omit<typeof FB, never> = FB
const FiberId: Omit<typeof FID, never> = FID
const FiberRef: Omit<typeof FRE, never> = FRE
const FiberScope: Omit<typeof FSCO, never> = FSCO
const Hub: Omit<typeof HB, never> = HB
const InterruptStatus: Omit<typeof IS, never> = IS
const Layer: Omit<typeof L, never> = L
const LogLevel: Omit<typeof LL, never> = LL
const LogSpan: Omit<typeof LS, never> = LS
const Logger: Omit<typeof LG, never> = LG

export type Hub<A> = HB.Hub<A>
export type Effect<R, E, A> = E.Effect<R, E, A>

/**
 * @model Enqueue
 * @model Dequeue
 */
export type Queue<A> = Q.Queue<A>

export type Ref<A> = R.Ref<A>
export type Cause<A> = C.Cause<A>
export type Exit<E, A> = EX.Exit<E, A>
export type Clock = CL.Clock
export type Cached<E, A> = CA.Cached<E, A>
export type Reloadable<A> = RL.Reloadable<A>
export type Fiber<E, A> = FB.Fiber<E, A>
export type Deferred<E, A> = D.Deferred<E, A>
export type FiberId = FID.FiberId
export type FiberRef<A> = FRE.FiberRef<A>
export type FiberScope = FSCO.FiberScope
export type Layer<R, E, A> = L.Layer<R, E, A>
export type Logger<M, O> = LG.Logger<M, O>
export type LogLevel = LL.LogLevel
export type LogSpan = LS.LogSpan
export type Random = RND.Random
export type Runtime<A> = RN.Runtime<A>
export type RuntimeFlags = RF.RuntimeFlags
export type Scope = SCO.Scope
export type Supervisor<A> = SUP.Supervisor<A>
export type Schedule<S, E, I, O> = SCH.Schedule<S, E, I, O>
export type ScopedRef<A> = SCR.ScopedRef<A>
export type Metric<Type, In, Out> = ME.Metric<Type, In, Out>

//
// Simulated Modules
//

export type Enqueue<A> = Q.Enqueue<A>
export type Dequeue<A> = Q.Dequeue<A>

export {
  Effect,
  Queue,
  Ref,
  Cause,
  Deferred,
  Clock,
  Cached,
  Reloadable,
  Runtime,
  RuntimeFlags,
  Schedule,
  Scope,
  ScopedRef,
  Supervisor,
  DefaultServices,
  Exit,
  Fiber,
  FiberId,
  FiberRef,
  FiberScope,
  Hub,
  InterruptStatus,
  Layer,
  LogLevel,
  LogSpan,
  Logger,
  Metric,
  Random,
}
