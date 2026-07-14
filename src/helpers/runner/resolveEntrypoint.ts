import { type BehaviorError } from '~/types'
import { behaviorError } from '~/helpers/errors/behaviorError'
import { type RunnerEnvironment } from '~/helpers/runner/runnerTypes'

export const resolveEntrypoint = <TContext, TPatch>(
  entrypoint: string,
  environment: RunnerEnvironment<TContext, TPatch>
): { id: string } | { error: BehaviorError } => {
  const config = environment.configRef.current
  if (!config) {
    return { error: behaviorError('CONFIG_INVALID', 'No behavior config loaded', { stage: { phase: 'entrypoint' } }) }
  }
  const id = config.entrypoints?.[entrypoint] ?? entrypoint
  if (!config.strategies[id]) {
    return {
      error: behaviorError('STRATEGY_NOT_FOUND', `Strategy "${id}" is not defined`, {
        strategy: id,
        stage: { phase: 'entrypoint', entrypoint, strategy: id },
      }),
    }
  }
  return { id }
}
