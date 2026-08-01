import { type BehaviorActionArgs, type BehaviorActionResult } from '~/types'

export const coreSet = <TContext, TPatch>({
  props,
  runtime,
}: BehaviorActionArgs<TContext>): BehaviorActionResult<TContext, TPatch> => {
  const path = props.path

  if (typeof path === 'string') {
    runtime.set(path, props.value)
  }
  return props.data ? { data: props.data as Record<string, unknown> } : undefined
}
