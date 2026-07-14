export const changedCondition = (_args: unknown, current: unknown, previous: unknown): boolean =>
  !Object.is(current, previous)
