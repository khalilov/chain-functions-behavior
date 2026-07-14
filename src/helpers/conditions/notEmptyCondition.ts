import { sizeOf } from '~/helpers/conditions/sizeOf'

export const notEmptyCondition = (_args: unknown, value: unknown): boolean => sizeOf(value) > 0
