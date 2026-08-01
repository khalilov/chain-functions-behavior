import { type BehaviorActionResult } from '~/types'

export const coreNoop = <TContext, TPatch>(): BehaviorActionResult<TContext, TPatch> => undefined
