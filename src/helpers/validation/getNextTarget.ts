export const getNextTarget = (next: unknown): string | undefined => {
  if (typeof next === 'string') {
    return next
  }
  if (next && typeof next === 'object' && 'strategy' in next && typeof next.strategy === 'string') {
    return next.strategy
  }

  return undefined
}
