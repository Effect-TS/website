import * as E from '@effect/core/io/Effect'
import * as Q from '@effect/core/io/Queue'
import * as R from '@effect/core/io/Ref'

const Effect: Omit<typeof E, never> = E
const Queue: Omit<typeof Q, `unsafeCreate` | `${string}Strategy`> = Q
const Ref: Omit<typeof R, never> = R

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
}
