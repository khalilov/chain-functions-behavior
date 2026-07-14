import { type BehaviorAction } from '~/types'

export const corePatch =
  <TContext, TPatch>(): BehaviorAction<TContext, TPatch> =>
  ({ props, runtime }) => {
    if ('patch' in props) {
      runtime.patch(props.patch)
    }
    return undefined
  }
