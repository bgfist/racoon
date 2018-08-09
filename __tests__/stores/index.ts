import { reducer } from './reducer'
import { createStore } from 'redux'

export const storeA = createStore(reducer)
export const storeB = createStore(reducer)
export function createNewStore() {
  return createStore(reducer)
}

export * from './action'
export * from './reducer'
