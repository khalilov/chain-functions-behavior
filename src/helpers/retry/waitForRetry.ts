export const waitForRetry = (delay: number, signal: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, delay)
    const abort = (): void => {
      clearTimeout(timer)
      reject(signal.reason)
    }

    signal.addEventListener('abort', abort, { once: true })
  })
