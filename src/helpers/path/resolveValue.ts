import { pick } from 'objwalk'
import { type BehaviorInput } from '~/types'
import { pathReferenceRegex } from '~/helpers/path/pathReferenceRegex'

export type ResolveScope<TContext> = {
  context: TContext
  data: Record<string, unknown>
  input: BehaviorInput
}

export const resolveValue = <TContext>(value: unknown, scope: ResolveScope<TContext>): unknown => {
  if (typeof value === 'string') {
    const match = value.match(pathReferenceRegex)
    if (!match) {
      return value
    }
    const root = match[1] as 'context' | 'data' | 'input'
    const path = match[2] ?? ''
    const source = scope[root]
    if (!path) {
      return source
    }
    if (!source || typeof source !== 'object') {
      return undefined
    }
    return pick(source as Record<string, unknown>, path)
  }

  if (Array.isArray(value)) {
    return value.map((item) => resolveValue(item, scope))
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    if (typeof record.$template === 'string') {
      return record.$template.replace(/\{\{\s*([A-Za-z0-9_$.[\]-]+)\s*\}\}/g, (_, key) => {
        const resolved = resolveValue(`$data.${key}`, scope)
        return resolved == null ? '' : String(resolved)
      })
    }
    return Object.fromEntries(Object.entries(record).map(([key, item]) => [key, resolveValue(item, scope)]))
  }

  return value
}
