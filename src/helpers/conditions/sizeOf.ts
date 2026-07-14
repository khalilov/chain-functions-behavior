export const sizeOf = (value: unknown): number => {
  if (value == null) {
    return 0
  }
  if (typeof value === 'string' || Array.isArray(value)) {
    return value.length
  }
  if (value instanceof Map || value instanceof Set) {
    return value.size
  }
  if (typeof value === 'object') {
    return Object.keys(value).length
  }
  return 0
}
