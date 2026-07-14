import { type BehaviorConfig, type BehaviorValidationIssue } from '~/types'

export const validateNextList = (
  config: BehaviorConfig,
  list: unknown,
  path: string,
  strategy: string,
  errors: BehaviorValidationIssue[]
): void => {
  if (list === undefined) {
    return
  }
  if (!Array.isArray(list)) {
    errors.push({ code: 'NEXT_INVALID', message: 'then/catch must be arrays', strategy, path })
    return
  }
  list.forEach((item, index) => {
    const target = typeof item === 'string' ? item : (item as { strategy?: unknown })?.strategy
    if (typeof target !== 'string' || !config.strategies[target]) {
      errors.push({
        code: 'STRATEGY_NOT_FOUND',
        message: `Next strategy "${String(target)}" is not defined`,
        strategy,
        path: `${path}.${index}`,
      })
    }
  })
}
