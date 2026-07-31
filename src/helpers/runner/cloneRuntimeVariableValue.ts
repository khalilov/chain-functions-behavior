import { unsupportedVariablesError } from '~/helpers/runner/unsupportedVariablesError'

export const cloneRuntimeVariableValue = (value: unknown, seen: WeakMap<object, unknown>): unknown => {
  if (typeof value === 'function' || typeof value === 'symbol' || typeof value === 'undefined') {
    throw unsupportedVariablesError()
  }
  if (!value || typeof value !== 'object') {
    return value
  }

  const existing = seen.get(value)
  if (existing) {
    return existing
  }

  if (Array.isArray(value)) {
    if (Object.getOwnPropertySymbols(value).length > 0) {
      throw unsupportedVariablesError()
    }
    const clone: unknown[] = new Array(value.length)
    seen.set(value, clone)
    for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
      if (key === 'length') {
        continue
      }
      const index = Number(key)
      if (!Number.isInteger(index) || index < 0 || index >= value.length || String(index) !== key) {
        throw unsupportedVariablesError()
      }
      if ('get' in descriptor || 'set' in descriptor) {
        throw unsupportedVariablesError()
      }
      Object.defineProperty(clone, key, {
        value: cloneRuntimeVariableValue(descriptor.value, seen),
        enumerable: descriptor.enumerable ?? false,
        configurable: false,
        writable: false,
      })
    }
    return Object.freeze(clone)
  }

  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) {
    throw unsupportedVariablesError()
  }
  if (Object.getOwnPropertySymbols(value).length > 0) {
    throw unsupportedVariablesError()
  }

  const clone = Object.create(prototype) as Record<string, unknown>
  seen.set(value, clone)
  for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
    if ('get' in descriptor || 'set' in descriptor) {
      throw unsupportedVariablesError()
    }
    Object.defineProperty(clone, key, {
      value: cloneRuntimeVariableValue(descriptor.value, seen),
      enumerable: descriptor.enumerable ?? false,
      configurable: false,
      writable: false,
    })
  }
  return Object.freeze(clone)
}
