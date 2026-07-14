import { type BehaviorAction } from '~/types'

export const coreSetData =
  <TContext, TPatch>(): BehaviorAction<TContext, TPatch> =>
  ({ props, runtime }) => {
    const path = props.path
    if (typeof path === 'string') {
      runtime.setData(path, props.value)
    }
    return props.data ? { data: props.data as Record<string, unknown> } : undefined
  }
