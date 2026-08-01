import { type BehaviorConfig } from '~/types'

/** @deprecated Pass the configuration object directly to `createChainBehavior` or `runner.loadConfig`. */
export const defineBehaviorConfig = <TConfig extends BehaviorConfig>(config: TConfig): TConfig => config
