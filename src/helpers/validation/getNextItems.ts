import { type BehaviorNext } from '~/types'

export const getNextItems = (value: unknown): BehaviorNext[] => (Array.isArray(value) ? value : [])
