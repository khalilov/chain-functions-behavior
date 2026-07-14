import { sizeOf } from '~/helpers/conditions/sizeOf'

export const emptyCondition = (_args: unknown, value: unknown): boolean => sizeOf(value) === 0
