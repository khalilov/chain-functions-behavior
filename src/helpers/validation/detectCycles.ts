import { type BehaviorConfig, type BehaviorValidationIssue } from '~/types'

export const detectCycles = (
  config: BehaviorConfig,
  errors: BehaviorValidationIssue[],
  warnings: BehaviorValidationIssue[]
): void => {
  const visiting = new Set<string>()
  const visited = new Set<string>()

  const visit = (id: string, path: string[]): boolean => {
    if (visiting.has(id)) {
      const cycle = [...path, id]
      const hasTerminal = cycle.some((item) => config.strategies[item]?.terminal)
      const issue = {
        code: 'CYCLE_DETECTED',
        message: `Cycle detected: ${cycle.join(' -> ')}`,
        strategy: id,
      }
      ;(hasTerminal ? warnings : errors).push(issue)
      return true
    }
    if (visited.has(id)) {
      return false
    }
    visiting.add(id)
    for (const next of config.strategies[id]?.then ?? []) {
      const target = typeof next === 'string' ? next : next.strategy
      if (config.strategies[target]) {
        visit(target, [...path, id])
      }
    }
    visiting.delete(id)
    visited.add(id)
    return false
  }

  Object.keys(config.strategies ?? {}).forEach((id) => visit(id, []))
}
