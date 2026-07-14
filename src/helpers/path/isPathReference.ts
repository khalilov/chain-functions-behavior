export const isPathReference = (value: unknown): value is string => typeof value === 'string' && value.startsWith('$')
