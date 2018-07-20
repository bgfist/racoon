import { AnyAction } from 'redux'
import { HostContainer } from '../../src/host'
export * from './action'

export enum StoreType {
	A = 'A',
	B = 'B'
}

export function createTester(hostContainer: HostContainer) {
	return {
		observe: hostContainer.observe,
		getState: hostContainer.getState,
		dispatch(action: AnyAction, store: StoreType = StoreType.A): ReturnType<HostContainer['dispatch']> {
			return hostContainer.dispatch({
				...action,
				store: `store${store}`
			})
		}
	}
}
