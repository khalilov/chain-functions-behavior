import { type BehaviorAction } from '~/types'

export const coreStop =
  <TContext, TPatch>(): BehaviorAction<TContext, TPatch> =>
  ({ props, runtime }) =>
    runtime.stop(String(props.reason ?? 'stopped')) as ReturnType<BehaviorAction<TContext, TPatch>>
