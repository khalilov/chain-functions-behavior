import { type BehaviorAction, type BehaviorActionResult } from '~/types'
import { stopResult } from '~/helpers/runner/stopResult'

export const coreLoop =
  <TContext, TPatch>(): BehaviorAction<TContext, TPatch> =>
  ({ props, signal, runtime }) =>
    new Promise<BehaviorActionResult<TContext, TPatch>>((resolve) => {
      const configuredDuration = Number(props.duration ?? 0)
      const duration = Number.isFinite(configuredDuration) ? Math.max(1, configuredDuration) : 1
      let running = false
      let stopped = false

      const finish = (result: BehaviorActionResult<TContext, TPatch>): void => {
        if (stopped) {
          return
        }
        stopped = true
        clearInterval(interval)
        signal.removeEventListener('abort', abort)
        resolve(result)
      }

      const abort = (): void => {
        clearInterval(interval)
        finish({ continue: false })
      }

      const tick = async (): Promise<void> => {
        if (running || signal.aborted) {
          return
        }

        running = true

        try {
          const result = await runtime.executeThen()

          if (result.status === 'failed') {
            const recovered = await runtime.executeCatch()

            if (recovered?.status === 'failed') {
              finish({ type: 'fail', reason: recovered.error.message, error: recovered.error, handled: true })
            } else if (recovered?.status === 'stopped') {
              finish(stopResult<TPatch>(recovered.reason))
            } else if (!recovered) {
              finish({ type: 'fail', reason: result.error.message, error: result.error })
            }
          } else if (result.status === 'stopped') {

            finish(stopResult<TPatch>(result.reason))
          }
        } finally {
          running = false

          if (signal.aborted) {
            finish({ continue: false })
          }
        }
      }

      const interval = setInterval(() => {
        void tick().catch((error: unknown) => {
          finish({ type: 'fail', reason: 'core.loop tick failed', error })
        })
      }, duration)

      signal.addEventListener('abort', abort, { once: true })

      if (signal.aborted) {
        abort()
      }
    })
