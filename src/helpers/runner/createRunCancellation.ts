export type RunCancellation = {
  controller: AbortController
  dispose(): void
}

export const createRunCancellation = (source?: AbortSignal): RunCancellation => {
  const controller = new AbortController()
  const abort = (): void => controller.abort()

  if (source?.aborted) {
    abort()
  } else {
    source?.addEventListener('abort', abort, { once: true })
  }

  return {
    controller,
    dispose: () => source?.removeEventListener('abort', abort),
  }
}
