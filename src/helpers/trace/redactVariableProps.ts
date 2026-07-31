import { dependsOnVariables } from '~/helpers/trace/dependsOnVariables'

export const redactVariableProps = (raw: unknown, resolved: unknown): unknown => {
  if (
    (typeof raw === 'string' && (raw === '$variables' || raw.startsWith('$variables.'))) ||
    (raw &&
      typeof raw === 'object' &&
      !Array.isArray(raw) &&
      ((typeof (raw as Record<string, unknown>).$template === 'string' && dependsOnVariables(raw)) ||
        (Object.prototype.hasOwnProperty.call(raw, '$expression') && dependsOnVariables(raw))))
  ) {
    return '[REDACTED]'
  }
  if (Array.isArray(raw) && Array.isArray(resolved)) {
    return raw.map((item, index) => redactVariableProps(item, resolved[index]))
  }
  if (raw && resolved && typeof raw === 'object' && typeof resolved === 'object') {
    return Object.fromEntries(
      Object.entries(raw as Record<string, unknown>).map(([key, item]) => [
        key,
        redactVariableProps(item, (resolved as Record<string, unknown>)[key]),
      ])
    )
  }
  return resolved
}
