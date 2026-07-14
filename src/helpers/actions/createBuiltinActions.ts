import { type BehaviorAction } from '~/types'
import { createActionsRegistry } from '~/registry/actions'

export const createBuiltinActions = <TContext, TPatch>(): Record<string, BehaviorAction<TContext, TPatch>> =>
  Object.fromEntries(createActionsRegistry<TContext, TPatch>())
