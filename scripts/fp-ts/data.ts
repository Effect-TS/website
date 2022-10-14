import * as R from '@fp-ts/core/Result'
import * as RA from '@fp-ts/core/ReadonlyArray'

const Result: Omit<typeof R, never> = R
const ReadonlyArray: Omit<typeof RA, never> = RA

export type Result<E, A> = R.Result<E, A>

export {
  /**
   * Reference Documentation for the module '@fp-ts/data/Result'
   */
  Result,
  /**
   * Reference Documentation for the module '@fp-ts/data/ReadonlyArray'
   */
  ReadonlyArray,
}
