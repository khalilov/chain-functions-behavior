import { type BehaviorConfig, type BehaviorValidationIssue, type BehaviorValidationResult } from '~/types'
import { detectCycles } from '~/helpers/validation/detectCycles'
import { validateCondition } from '~/helpers/validation/validateCondition'
import { validateNextList } from '~/helpers/validation/validateNextList'
import { validateRefs } from '~/helpers/validation/validateRefs'
import { validModes } from '~/helpers/validation/validationConstants'
import { type RegistryReader } from '~/helpers/validation/registryReader'

export const validateBehaviorConfig = (
  config: BehaviorConfig | undefined,
  actionsRegistry: RegistryReader,
  conditionsRegistry: RegistryReader
): BehaviorValidationResult => {
  const errors: BehaviorValidationIssue[] = []
  const warnings: BehaviorValidationIssue[] = []

  if (!config || typeof config !== 'object') {
    return {
      ok: false,
      errors: [{ code: 'CONFIG_INVALID', message: 'Config must be an object' }],
      warnings,
    }
  }
  if (!config.strategies || typeof config.strategies !== 'object') {
    errors.push({ code: 'CONFIG_INVALID', message: 'Config must include strategies', path: 'strategies' })
  }

  for (const [id, strategy] of Object.entries(config.strategies ?? {})) {
    if (!strategy || typeof strategy !== 'object') {
      errors.push({ code: 'STRATEGY_INVALID', message: 'Strategy must be an object', strategy: id })
      continue
    }
    if (!strategy.fn || typeof strategy.fn !== 'string') {
      errors.push({ code: 'FN_MISSING', message: 'Strategy fn is required', strategy: id, path: `${id}.fn` })
    } else if (!actionsRegistry.has(strategy.fn)) {
      errors.push({
        code: 'ACTION_NOT_FOUND',
        message: `Action "${strategy.fn}" is not registered`,
        strategy: id,
        path: `${id}.fn`,
      })
    }
    if (strategy.mode && !validModes.has(strategy.mode)) {
      errors.push({ code: 'MODE_INVALID', message: `Mode "${strategy.mode}" is invalid`, strategy: id })
    }
    validateNextList(config, strategy.then, `${id}.then`, id, errors)
    validateNextList(config, strategy.catch, `${id}.catch`, id, errors)
    validateCondition(strategy.when, id, `${id}.when`, conditionsRegistry, errors)
    validateRefs(strategy.props, id, `${id}.props`, errors)
  }

  for (const [name, target] of Object.entries(config.entrypoints ?? {})) {
    if (!config.strategies[target]) {
      errors.push({
        code: 'STRATEGY_NOT_FOUND',
        message: `Entrypoint "${name}" references missing strategy "${target}"`,
        path: `entrypoints.${name}`,
      })
    }
  }

  detectCycles(config, errors, warnings)
  return { ok: errors.length === 0, errors, warnings }
}
