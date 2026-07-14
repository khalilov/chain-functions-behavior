export const includesCondition = (_args: unknown, collection: unknown, value: unknown): boolean => {
  if (typeof collection === 'string') {
    return collection.includes(String(value))
  }
  if (Array.isArray(collection)) {
    return collection.includes(value)
  }
  if (collection instanceof Set) {
    return collection.has(value)
  }
  return false
}
