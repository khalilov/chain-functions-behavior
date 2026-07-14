import { type BehaviorConditionExpression, type BehaviorValidationIssue } from '~/types'
import { type RegistryReader } from '~/helpers/validation/registryReader'
import { controlConditions } from '~/helpers/validation/validationConstants'
import { validateRefs } from '~/helpers/validation/validateRefs'

export const validateCondition = (
  expression: BehaviorConditionExpression | undefined,
  strategy: string,
  path: string,
  conditionsRegistry: RegistryReader,
  errors: BehaviorValidationIssue[]
): void => {
  if (expression === undefined || typeof expression === 'boolean') {
    return
  }
  if (!Array.isArray(expression) || typeof expression[0] !== 'string') {
    errors.push({ code: 'CONDITION_INVALID', message: 'Condition expression is invalid', strategy, path })
    return
  }
  const [operator, ...args] = expression
  if (operator === 'and' || operator === 'or') {
    args.forEach((arg, index) =>
      validateCondition(
        arg as BehaviorConditionExpression,
        strategy,
        `${path}.${index + 1}`,
        conditionsRegistry,
        errors
      )
    )
    return
  }
  if (operator === 'not') {
    validateCondition(args[0] as BehaviorConditionExpression, strategy, `${path}.1`, conditionsRegistry, errors)
    return
  }
  if (!conditionsRegistry.has(operator) && !controlConditions.has(operator)) {
    errors.push({
      code: 'CONDITION_NOT_FOUND',
      message: `Condition "${operator}" is not registered`,
      strategy,
      path,
    })
  }
  args.forEach((arg, index) => validateRefs(arg, strategy, `${path}.${index + 1}`, errors))
}
