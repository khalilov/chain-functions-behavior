export const isTimedOut = (startedAt: number, timeout: number | undefined): boolean =>
  timeout !== undefined && timeout > 0 && Date.now() - startedAt > timeout
