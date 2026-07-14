export const cooldownReadyCondition = (_args: unknown, now: unknown, lastAt: unknown, cooldownMs: unknown): boolean => {
  if (lastAt == null) {
    return true
  }
  return Number(now) - Number(lastAt) >= Number(cooldownMs ?? 0)
}
