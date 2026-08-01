export const serializeError = (error: unknown): { error: string } => ({
  error: error instanceof Error ? error.message : String(error),
})
