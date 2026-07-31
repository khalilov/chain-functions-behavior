import { type PickOptions } from 'objwalk'

export const protectedPickOptions: PickOptions = {
  inherited: false,
  ignore: ['__proto__', 'prototype', 'constructor'],
}
