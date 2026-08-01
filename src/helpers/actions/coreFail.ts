import { type BehaviorActionArgs, type BehaviorActionResult } from '~/types'

export const coreFail = <TContext, TPatch>({
  props,
  runtime,
}: BehaviorActionArgs<TContext>): BehaviorActionResult<TContext, TPatch> =>
  runtime.fail(String(props.reason ?? 'failed'), props.data as Record<string, unknown> | undefined)
