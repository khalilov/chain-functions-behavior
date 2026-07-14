import { type BehaviorAction } from '~/types'

export const coreDelay =
  <TContext, TPatch>(): BehaviorAction<TContext, TPatch> =>
  async ({ props }) => {
    const ms = Math.max(0, Number(props.ms ?? 0))
    await new Promise((resolve) => setTimeout(resolve, ms))
    return undefined
  }
