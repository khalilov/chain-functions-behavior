import { type BehaviorActionArgs, type BehaviorActionResult, type BehaviorActionStop } from '~/types'

export const coreStop = <TContext, TPatch>({
  props,
  runtime,
}: BehaviorActionArgs<TContext>): BehaviorActionResult<TContext, TPatch> =>
  runtime.stop(String(props.reason ?? 'stopped')) as BehaviorActionStop<TPatch>
