import { pick } from 'objwalk'
import { type ExpressionDetails } from '~/helpers/path/expressionDetails'
import { failExpression } from '~/helpers/path/failExpression'
import { protectedPickOptions } from '~/helpers/path/protectedPickOptions'

export const propertyValue = (target: unknown, key: unknown, details: ExpressionDetails): unknown => {
  if ((typeof target !== 'object' && typeof target !== 'function') || target === null || typeof key !== 'string') {
    failExpression('EXPRESSION_PATH_NOT_FOUND', 'Expression property was not found', details)
  }
  const resolved = pick(target as Record<string, unknown>, key as string, protectedPickOptions)
  if (resolved === undefined) {
    failExpression('EXPRESSION_PATH_NOT_FOUND', 'Expression property was not found', details)
  }
  return resolved
}
