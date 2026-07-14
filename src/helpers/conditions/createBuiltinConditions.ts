import { type BehaviorConditionFn } from '~/types'
import { createConditionsRegistry } from '~/registry/conditions'

export const createBuiltinConditions = <TContext>(): Record<string, BehaviorConditionFn<TContext>> =>
  Object.fromEntries(createConditionsRegistry<TContext>())
