export const isPromiseLike = <T>(value: unknown): value is Promise<T> =>
  Boolean(value && typeof value === 'object' && 'then' in value && typeof (value as Promise<T>).then === 'function')
