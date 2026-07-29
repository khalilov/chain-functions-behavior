import { type BehaviorConfig, type BehaviorNext, type BehaviorValidationIssue } from '~/types'

const targetOf = (next: BehaviorNext): string => {
  return typeof next === 'string' ? next : next.strategy
}

const itemsOf = (value: unknown): BehaviorNext[] => {
  return Array.isArray(value) ? value : []
}

export const detectNestedLoops = (config: BehaviorConfig, errors: BehaviorValidationIssue[]): void => {
  for (const [outerId, outer] of Object.entries(config.strategies)) {
    if (outer.fn !== 'core.loop') {
      continue
    }

    const visited = new Set<string>([outerId])

    const visit = (id: string, path: string[]): void => {
      const strategy = config.strategies[id]

      if (!strategy) {
        return
      }

      if (strategy.fn === 'core.loop') {
        errors.push({
          code: 'NESTED_LOOP',
          message: `Strategy "${id}" cannot run inside loop "${outerId}". Nested core.loop strategies are not supported.`,
          strategy: id,
          path: [...path, id].join(' -> '),
        })
        return
      }

      if (visited.has(id)) {
        return
      }

      visited.add(id)

      for (const branch of ['then', 'catch'] as const) {
        for (const next of itemsOf(strategy[branch])) {
          const target = targetOf(next)
          visit(target, [...path, `${id}.${branch}`])
        }
      }
    }

    for (const branch of ['then', 'catch'] as const) {
      for (const next of itemsOf(outer[branch])) {
        visit(targetOf(next), [`${outerId}.${branch}`])
      }
    }
  }
}
