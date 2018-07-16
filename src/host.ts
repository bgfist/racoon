import { Store } from 'redux'
import { IContainer, IAction } from './container'

export { Store }

export type Selector = () => {
	select: (getState: HostContainer['getState']) => any
	affected: string[]
}

export interface ISelectors {
	[k: string]: Selector
}

export interface IStores {
	[k: string]: Store
}

export class HostContainer implements IContainer {
	private stores: IStores
	private observables: any

	constructor(stores: IStores) {
		this.stores = stores
	}

	public observe(path: any, listener: any) {
		if (typeof path === 'string') {
			listener(path)
		} else if (typeof path === 'object') {
			const changes: any = {}
			Object.keys(path).forEach(k => {
				const $path = path[k]
				changes[k] = $path
			})
			listener(changes)
		}
	}

	public dispatch(action: IAction) {
		const { type, store, payload } = action
		this.stores[store].dispatch({ type, payload })
		return action
	}

	public getState(store: string) {
		return this.stores[store].getState()
	}

	public defineSelectors(selectors: ISelectors) {
		Object.keys(selectors)
	}
}
