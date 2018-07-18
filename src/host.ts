import { Store } from 'redux'
import { IContainer, IAction } from './container'

export { Store }

export type Selector = () => {
	select: (getState: HostContainer['getState'], ...args: any[]) => any
	affected: string[]
}

export interface ISelectors {
	[k: string]: Selector
}

export interface IStores {
	[k: string]: Store
}

export type IListener = (newValue: any, prevValue: any) => void

interface IObservable {
	type: number
	prevValue: any
	getValue: () => any
	listener: IListener
	combinePrevValue?: () => any
}

export class HostContainer implements IContainer {
	private stores: IStores
	private observables: { [storeKey: string]: IObservable[] } = {}
	private selectors: ISelectors = {}

	constructor(stores: IStores) {
		this.stores = stores
		this.subscribeAllStore()
		Object.keys(stores).forEach(key => {
			this.observables[key] = []
		})
	}

	private hasChanged(observable: IObservable, newValue: any): boolean {
		const { prevValue } = observable
		if (observable.type === 0) {
			return newValue === prevValue
		}
		return Object.keys(newValue).some(key => newValue[key] !== prevValue[key])
	}

	private subscribeAllStore() {
		const stores = this.stores
		Object.keys(stores).forEach(key => {
			const store = stores[key]
			store.subscribe(() => {
				const state = store.getState()
				this.observables[key].forEach(observable => {
					const newValue = observable.getValue()
					if (this.hasChanged(observable, newValue)) {
						if (observable.type === 0) {
							observable.listener.call(null, newValue, observable.prevValue)
						} else {
							const combinedPrevValue = (observable.combinePrevValue as () => any)()
							const combinedNewValue: { [key: string]: any } = {}
							Object.keys(combinedPrevValue).forEach(k => {
								combinedNewValue[k] = combinedPrevValue[k]
							})
							Object.keys(newValue).forEach(k => {
								combinedNewValue[k] = newValue[k]
							})
							observable.listener.call(null, combinedNewValue, combinedPrevValue)
						}
						observable.prevValue = newValue
					}
				})
			})
		})
	}

	private pushSingleObservable(storeKey: string, observable: IObservable): () => void {
		this.observables[storeKey].push(observable)
		return () => {
			this.observables[storeKey] = this.observables[storeKey].filter(o => o !== observable)
		}
	}

	private getAccessFunc(keysStr: string | undefined, storeKey: string): () => any {
		if (!keysStr) {
			return () => this.stores[storeKey]
		}
		const keys = keysStr.split('.')
		return () => {
			let value: any = this.stores[storeKey]
			keys.forEach(key => {
				value = value[key]
			})
			return value
		}
	}

	private getStoreObservable(storeKey: string, keysMap: { [key: string]: string }, listener: IListener): IObservable {
		const accessFuncs: Array<{
			(): any
			key: string
		}> = []
		Object.keys(keysMap).forEach(key => {
			const accessFunc: any = this.getAccessFunc(keysMap[key], storeKey)
			accessFunc.key = key
			accessFuncs.push(accessFunc)
		})
		return {
			type: 1,
			prevValue: {},
			getValue() {
				const result: { [key: string]: any } = {}
				accessFuncs.forEach(fn => {
					result[fn.key as string] = fn()
				})
				return result
			},
			listener
		}
	}

	/**
	 * 返回解析后的 selector 和 传入参数
	 * @param path observe 的 selector 路径，包含标识符 '$'
	 */
	private parseSelector(path: string): [string, string[]] {
		path = path.slice(1).trim()
		const [, selector, argStr] = path.match(/^(\w+)\((.*)\)$/) as RegExpMatchArray
		const args = argStr.split(',').map(s => {
			s = s.trim()
			if ((s[0] === '"' && s[s.length - 1] === '"') || (s[0] === "'" && s[s.length - 1] === "'")) {
				return s.slice(1, -1)
			}
			return s
		})
		return [selector, args]
	}

	public observe(path: string | { [key: string]: string }, listener: IListener): () => void {
		if (typeof path === 'string') {
			// if (path[0] === '$') {

			//     // selector
			//     path = path.slice(1)
			//     const selector = this.selectors[path]

			// }
			const [storeKey, keysStr] = path.split('#')
			const observable = {
				type: 0,
				prevValue: {},
				getValue: this.getAccessFunc(keysStr, storeKey),
				listener
			}
			return this.pushSingleObservable(storeKey, observable)
		}
		const allObservables: IObservable[] = []
		const unsubscribe = Object.keys(path).map(key => {
			const [storeKey, keysStr] = path[key].split('#')
			const observable = this.getStoreObservable(
				storeKey,
				{
					key: keysStr
				},
				listener
			)
			return this.pushSingleObservable(storeKey, observable)
		})
		const combinePrevValue = (): any => {
			const result: { [key: string]: any } = {}
			allObservables.forEach(observable => {
				const { prevValue } = observable
				Object.keys(prevValue).forEach(key => {
					result[key] = prevValue[key]
				})
			})
			return result
		}
		allObservables.forEach(observable => (observable.combinePrevValue = combinePrevValue))
		return () => unsubscribe.forEach(fn => fn())
	}

	public dispatch(action: IAction) {
		const { type, store, payload } = action
		this.stores[store].dispatch({ type, payload })
		return action
	}

	public getState(path: string) {
		throw new Error('unimplemented')
	}

	public defineSelectors(selectors: ISelectors) {
		Object.keys(selectors).forEach(key => {
			this.selectors[key] = selectors[key]
		})
	}
}
