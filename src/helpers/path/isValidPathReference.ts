import { pathReferenceRegex } from '~/helpers/path/pathReferenceRegex'

export const isValidPathReference = (value: string): boolean => pathReferenceRegex.test(value)
