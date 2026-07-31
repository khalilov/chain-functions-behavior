export const unsupportedVariablesError = (): TypeError =>
  new TypeError('Runtime variables support only primitives, arrays, and plain objects')
