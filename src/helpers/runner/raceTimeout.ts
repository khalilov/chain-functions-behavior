export const raceTimeout = <T>(
  promise: Promise<T>,
  timeout: number,
  startedAt: number,
  onTimeout: () => T
): Promise<T> =>
  new Promise((resolve, reject) => {
    const remaining = Math.max(timeout - (Date.now() - startedAt), 0)
    const timer = setTimeout(() => resolve(onTimeout()), remaining)

    void promise
      .then((result) => {
        clearTimeout(timer)
        resolve(result)
      })
      .catch((cause: unknown) => {
        clearTimeout(timer)
        reject(cause)
      })
  })
