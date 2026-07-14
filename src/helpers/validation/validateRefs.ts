import { type BehaviorValidationIssue } from '~/types'
import { isPathReference } from '~/helpers/path/isPathReference'
import { isValidPathReference } from '~/helpers/path/isValidPathReference'

export const validateRefs = (
  value: unknown,
  strategy: string,
  path: string,
  errors: BehaviorValidationIssue[]
): void => {
  if (typeof value === 'string') {
    if (isPathReference(value) && !isValidPathReference(value)) {
      errors.push({ code: 'PATH_INVALID', message: `Invalid path reference "${value}"`, strategy, path })
    }
    return
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => validateRefs(item, strategy, `${path}.${index}`, errors))
  }
  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, item]) => validateRefs(item, strategy, `${path}.${key}`, errors))
  }
}
