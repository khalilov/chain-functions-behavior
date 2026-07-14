import { type BehaviorAction } from '~/types'

export const coreNoop =
  <TContext, TPatch>(): BehaviorAction<TContext, TPatch> =>
  () =>
    undefined
