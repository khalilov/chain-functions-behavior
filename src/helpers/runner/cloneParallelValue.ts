export const cloneParallelValue = (value: unknown, seen = new WeakMap<object, unknown>()): unknown => {
  if (!value || typeof value !== 'object') {
    return value
  }

  const existing = seen.get(value)
  if (existing) {
    return existing
  }

  if (Array.isArray(value)) {
    const clone: unknown[] = []
    seen.set(value, clone)

    for (const item of value) {
      clone.push(cloneParallelValue(item, seen))
    }

    return clone
  }

  if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) {
    return value
  }

  const clone: Record<string, unknown> = {}
  seen.set(value, clone)

  for (const [key, item] of Object.entries(value)) {
    clone[key] = cloneParallelValue(item, seen)
  }

  return clone
}
