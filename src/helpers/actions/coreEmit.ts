import { type BehaviorActionArgs, type BehaviorActionResult } from '~/types'

export const coreEmit = <TContext, TPatch>({
  props,
  runtime,
}: BehaviorActionArgs<TContext>): BehaviorActionResult<TContext, TPatch> => {
  const type = props.type

  if (typeof type === 'string') {
    runtime.emit({ type, payload: props.payload })
  }
}
