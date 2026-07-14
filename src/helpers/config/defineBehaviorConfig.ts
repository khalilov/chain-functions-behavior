import { type BehaviorConfig } from '~/types'

export const defineBehaviorConfig = <TConfig extends BehaviorConfig>(config: TConfig): TConfig => config
