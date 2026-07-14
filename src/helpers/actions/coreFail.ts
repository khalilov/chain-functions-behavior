import { type BehaviorAction } from '~/types'

export const coreFail =
  <TContext, TPatch>(): BehaviorAction<TContext, TPatch> =>
  ({ props, runtime }) =>
    runtime.fail(String(props.reason ?? 'failed'), props.data as Record<string, unknown> | undefined)
