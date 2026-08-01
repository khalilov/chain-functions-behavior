import { type BehaviorActionArgs, type BehaviorActionResult } from '~/types'

export const corePatch = <TContext, TPatch>({
  props,
  runtime,
}: BehaviorActionArgs<TContext>): BehaviorActionResult<TContext, TPatch> => {
  if ('patch' in props) {
    runtime.patch(props.patch)
  }
}
