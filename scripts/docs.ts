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
const Metrics: Omit<typeof ME, never> = ME
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

export {
  /**
   * Reference Documentation for the module '@effect/core/io/Effect'
   */
  Effect,
  /**
   * Reference Documentation for the module '@effect/core/io/Queue'
   */
  Queue,
  /**
   * Reference Documentation for the module '@effect/core/io/Ref'
   */
  Ref,
  /**
   * Reference Documentation for the module '@effect/core/io/Cause'
   */
  Cause,
  /**
   * Reference Documentation for the module '@effect/core/io/Deferred'
   */
  Deferred,
  /**
   * Reference Documentation for the module '@effect/core/io/Clock'
   */
  Clock,
  /**
   * Reference Documentation for the module '@effect/core/io/Cached'
   */
  Cached,
  /**
   * Reference Documentation for the module '@effect/core/io/Reloadable'
   */
  Reloadable,
  /**
   * Reference Documentation for the module '@effect/core/io/Runtime'
   */
  Runtime,
  /**
   * Reference Documentation for the module '@effect/core/io/RuntimeFlags'
   */
  RuntimeFlags,
  /**
   * Reference Documentation for the module '@effect/core/io/Schedule'
   */
  Schedule,
  /**
   * Reference Documentation for the module '@effect/core/io/Scope'
   */
  Scope,
  /**
   * Reference Documentation for the module '@effect/core/io/ScopedRef'
   */
  ScopedRef,
  /**
   * Reference Documentation for the module '@effect/core/io/Supervisor'
   */
  Supervisor,
  /**
   * Reference Documentation for the module '@effect/core/io/DefaultServices'
   */
  DefaultServices,
  /**
   * Reference Documentation for the module '@effect/core/io/Exit'
   */
  Exit,
  /**
   * Reference Documentation for the module '@effect/core/io/Fiber'
   */
  Fiber,
  /**
   * Reference Documentation for the module '@effect/core/io/FiberId'
   */
  FiberId,
  /**
   * Reference Documentation for the module '@effect/core/io/FiberRef'
   */
  FiberRef,
  /**
   * Reference Documentation for the module '@effect/core/io/FiberScope'
   */
  FiberScope,
  /**
   * Reference Documentation for the module '@effect/core/io/Hub'
   */
  Hub,
  /**
   * Reference Documentation for the module '@effect/core/io/InterruptStatus'
   */
  InterruptStatus,
  /**
   * Reference Documentation for the module '@effect/core/io/Layer'
   */
  Layer,
  /**
   * Reference Documentation for the module '@effect/core/io/LogLevel'
   */
  LogLevel,
  /**
   * Reference Documentation for the module '@effect/core/io/LogSpan'
   */
  LogSpan,
  /**
   * Reference Documentation for the module '@effect/core/io/Logger'
   */
  Logger,
  /**
   * Reference Documentation for the module '@effect/core/io/Metrics'
   */
  Metrics,
  /**
   * Reference Documentation for the module '@effect/core/io/Random'
   */
  Random,
}
