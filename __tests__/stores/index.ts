import { reducer, IState, IAction, initState } from './reducer'
import { createStore, Store } from 'redux'

export const storeA: Store<IState, IAction> = createStore(reducer)
export const storeB: Store<IState, IAction> = createStore(reducer)
export function createNewStore(): Store<IState, IAction> {
	return createStore(reducer)
}
export { IState, IAction, initState }
