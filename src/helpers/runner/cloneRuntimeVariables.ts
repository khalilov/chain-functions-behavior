import { type BehaviorVariables } from '~/types'
import { cloneRuntimeVariableValue } from '~/helpers/runner/cloneRuntimeVariableValue'

export const cloneRuntimeVariables = (
  variables: BehaviorVariables,
  seen = new WeakMap<object, unknown>()
): BehaviorVariables => cloneRuntimeVariableValue(variables, seen) as BehaviorVariables
