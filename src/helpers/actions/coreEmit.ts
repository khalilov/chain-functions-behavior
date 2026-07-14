import { type BehaviorAction } from '~/types'

export const coreEmit =
  <TContext, TPatch>(): BehaviorAction<TContext, TPatch> =>
  ({ props, runtime }) => {
    const type = props.type
    if (typeof type === 'string') {
      runtime.emit({ type, payload: props.payload })
    }
    return undefined
  }
