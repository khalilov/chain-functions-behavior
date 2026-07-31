import { parseTemplate } from '~/helpers/path/parseTemplate'

export const dependsOnVariables = (value: unknown): boolean => {
  if (typeof value === 'string') {
    return value === '$variables' || value.startsWith('$variables.')
  }
  if (Array.isArray(value)) {
    return value.some(dependsOnVariables)
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    if (typeof record.$template === 'string') {
      const parsed = parseTemplate(record.$template)
      return parsed.ok && parsed.parts.some((part) => part.type === 'variable')
    }
    return Object.values(record).some(dependsOnVariables)
  }
  return false
}
