import {
  type BehaviorConditionExpression,
  type BehaviorConditionFn,
  type BehaviorError,
  type BehaviorInput,
  type BehaviorRuntime,
} from '~/types'
import { behaviorError } from '~/helpers/errors/behaviorError'
import { resolveValue } from '~/helpers/path/resolveValue'
import { ResolutionError } from '~/helpers/path/ResolutionError'

type EvaluateConditionScope<TContext> = {
  context: TContext
  input: BehaviorInput
  data: Record<string, unknown>
  runtime: Pick<BehaviorRuntime, 'resolve' | 'get' | 'data' | 'variables' | 'getData'>
  strategy?: string
}

export const evaluateCondition = <TContext>(
  expression: BehaviorConditionExpression | undefined,
  registry: Map<string, BehaviorConditionFn<TContext>>,
  scope: EvaluateConditionScope<TContext>
): { ok: true; matched: boolean } | { ok: false; error: BehaviorError } => {
  if (expression === undefined) {
    return { ok: true, matched: true }
  }
  if (typeof expression === 'boolean') {
    return { ok: true, matched: expression }
  }

  const [operator, ...rawArgs] = expression
  if (operator === 'and') {
    for (const item of rawArgs as BehaviorConditionExpression[]) {
      const result = evaluateCondition(item, registry, scope)
      if (!result.ok || !result.matched) {
        return result
      }
    }
    return { ok: true, matched: true }
  }
  if (operator === 'or') {
    for (const item of rawArgs as BehaviorConditionExpression[]) {
      const result = evaluateCondition(item, registry, scope)
      if (!result.ok) {
        return result
      }
      if (result.matched) {
        return { ok: true, matched: true }
      }
    }
    return { ok: true, matched: false }
  }
  if (operator === 'not') {
    const result = evaluateCondition(rawArgs[0] as BehaviorConditionExpression, registry, scope)
    return result.ok ? { ok: true, matched: !result.matched } : result
  }

  const condition = registry.get(operator)
  if (!condition) {
    return {
      ok: false,
      error: behaviorError('CONDITION_NOT_FOUND', `Condition "${operator}" is not registered`, {
        ...(scope.strategy ? { strategy: scope.strategy } : {}),
      }),
    }
  }

  try {
    const configPath = scope.strategy ? `strategies.${scope.strategy}.when` : 'when'
    const args = rawArgs.map((arg, index) =>
      resolveValue(arg, { ...scope, configPath: `${configPath}[${index + 1}]` })
    )
    return { ok: true, matched: Boolean(condition(scope, ...args)) }
  } catch (cause) {
    if (cause instanceof ResolutionError) {
      return { ok: false, error: cause.behaviorError }
    }
    throw cause
  }
}
