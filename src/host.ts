import { Store } from 'redux'
import { IContainer, IAction } from './container'

export type Selector = (
	getState: HostContainer['getState']
) => {
	select: (...args: any[]) => any
	affected: string[]
}

export interface ISelectors {
	[k: string]: Selector
}

export interface IStores {
	[k: string]: Store<any, any>
}

export type IListener = (newValue: any) => void

interface IObservable {
	prevValue: any
	getValue: () => any
	listener: IListener
	// 可通过判断是否有此值来判定订阅是否为 Map
	combinePrevValue?: () => any
}

interface IExecuteJob {
	newValue: any
	prevValue: any
	fn: IListener
}

function arrayFind<T>(arr: T[], fn: (item: T) => boolean): T | undefined {
	for (const item of arr) {
		if (fn(item)) {
			return item
		}
	}
	return undefined
}
function has(obj: object, key: string): boolean {
	return Object.prototype.hasOwnProperty.call(obj, key)
}

export class HostContainer implements IContainer {
	private stores: IStores
	private observables: { [storeKey: string]: IObservable[] } = {}
	private selectors: ISelectors = {}
	private selectorValues: { [observeSelector: string]: any } = {}
	private executeJobs: IExecuteJob[] = []

	constructor(stores: IStores) {
		this.stores = stores
		this.subscribeAllStore()
		Object.keys(stores).forEach(key => {
			this.observables[key] = []
		})
		this.observe = this.observe.bind(this)
		this.dispatch = this.dispatch.bind(this)
		this.getState = this.getState.bind(this)
		this.defineSelectors = this.defineSelectors.bind(this)
	}

	private hasChanged(observable: IObservable, newValue: any): boolean {
		const { prevValue } = observable
		if (!observable.combinePrevValue) {
			return newValue !== prevValue
		}
		return Object.keys(newValue).some(key => newValue[key] !== prevValue[key])
	}

	private subscribeAllStore(): void {
		const stores = this.stores
		Object.keys(stores).forEach(key => {
			const store = stores[key]
			store.subscribe(() => {
				this.observables[key].forEach(observable => {
					const newValue = observable.getValue()
					if (this.hasChanged(observable, newValue)) {
						if (!observable.combinePrevValue) {
							this.executeJobs.push({
								prevValue: observable.prevValue,
								newValue,
								fn: observable.listener
							})
						} else {
							/**
							 * TODO: 这部分可优化
							 */
							const combinedPrevValue = (observable.combinePrevValue as () => any)()
							const combinedNewValue: { [key: string]: any } = {}
							Object.keys(combinedPrevValue).forEach(k => {
								combinedNewValue[k] = combinedPrevValue[k]
							})
							Object.keys(newValue).forEach(k => {
								combinedNewValue[k] = newValue[k]
							})
							const targetJob = arrayFind<IExecuteJob>(this.executeJobs, job => job.fn === observable.listener)
							if (targetJob) {
								targetJob.newValue = combinedNewValue
							} else {
								this.executeJobs.push({
									newValue: combinedNewValue,
									prevValue: combinedPrevValue,
									fn: observable.listener
								})
							}
						}
						observable.prevValue = newValue
					}
				})
				this.executeJobs.forEach(({ fn, newValue }) => fn.call(null, newValue))
				this.executeJobs = []
			})
		})
	}

	private pushSingleObservable(storeKey: string, observable: IObservable): () => void {
		this.observables[storeKey].push(observable)
		return () => {
			this.observables[storeKey] = this.observables[storeKey].filter(o => o !== observable)
		}
	}

	private getAccessFunc(storeKey: string, keysStr: string | undefined): () => any {
		if (!this.stores[storeKey]) {
			throw new TypeError(`未找到 ${storeKey} 的 store`)
		}
		if (!keysStr) {
			return () => this.stores[storeKey].getState()
		}
		const keys = keysStr.split('.')
		return () => {
			let value: any = this.stores[storeKey].getState()
			// 未取到的 key 全部返回 undefined
			try {
				keys.forEach(key => {
					value = value[key]
				})
			} catch (e) {
				value = undefined
			}
			return value
		}
	}

	/**
	 * 返回解析后的 selector 和 传入参数
	 * @param path observe 的 selector 路径，包含标识符 '$'
	 */
	private parseSelector(path: string): [string, any[]] {
		path = path.slice(1).trim()
		if (!/\(.*\)/.test(path)) {
			throw new TypeError('selector 中必须为执行表达式')
		}
		let selector = ''
		let argStr = ''
		// const [, selector, argStr] = path.match(/^(\w+)\((.*)\)$/) as RegExpMatchArray
		try {
			const matchArr = path.match(/^(\w+)\((.*)\)$/) as RegExpMatchArray
			selector = matchArr[1]
			argStr = matchArr[2]
		} catch (e) {
			throw new TypeError(`无法解析的 selector: $${path}`)
		}
		let args = []
		// 参数解析策略暂时是只能用 JSON 解析
		try {
			args = JSON.parse(`[${argStr}]`)
		} catch (e) {
			throw new TypeError(`不能转为 JSON 的 selector 参数: ${argStr}`)
		}
		return [selector, args]
	}

	public observe(path: string | { [key: string]: string }, listener: IListener): () => void {
		if (typeof path === 'string') {
			if (path[0] === '$') {
				// observe 相同 selector 暂时开两个实例
				const [selectorKey, args] = this.parseSelector(path)
				const { select, affected } = this.selectors[selectorKey](this.getState)
				const observeKeys: { [key: number]: string } = {}
				affected.forEach((key, i) => {
					observeKeys[i] = key
				})

				// 确保 newValue 与此不等以此保证第一次 listener 被调用
				this.selectorValues[path] = NaN
				return this.observe(observeKeys, () => {
					const newValue = select.apply(null, args)
					if (this.selectorValues[path] !== newValue) {
						this.selectorValues[path] = newValue
						listener.call(null, newValue)
					}
				})
			}
			const [storeKey, keysStr] = path.split('#')
			const getValue = this.getAccessFunc(storeKey, keysStr)
			const prevValue = getValue()
			listener.call(null, prevValue)
			const observable = {
				prevValue,
				getValue,
				listener
			}
			return this.pushSingleObservable(storeKey, observable)
		}
		const allObservables: IObservable[] = []
		const unsubscribe = Object.keys(path).map(mainKey => {
			const [storeKey, keysStr] = path[mainKey].split('#')
			const accessFunc = this.getAccessFunc(storeKey, keysStr)
			const getValue = () => ({
				[mainKey]: accessFunc()
			})
			const observable = {
				prevValue: getValue(),
				getValue,
				listener
			}
			allObservables.push(observable)
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
		listener.call(null, combinePrevValue())
		allObservables.forEach(observable => (observable.combinePrevValue = combinePrevValue))
		return () => unsubscribe.forEach(fn => fn())
	}

	public dispatch(action: IAction) {
		const { type, store, payload } = action
		this.stores[store].dispatch({ type, payload })
		return action
	}

	public getState(path: string): any {
		if (path[0] === '$') {
			if (!has(this.selectorValues, path)) {
				let data = null
				this.observe(path, computed => {
					data = computed
				})()
				return data
			}
			return this.selectorValues[path]
		}
		const [storeKey, keysStr] = path.split('#')
		return this.getAccessFunc(storeKey, keysStr)()
	}

	public defineSelectors(selectors: ISelectors) {
		this.selectors = {
			...this.selectors,
			...selectors
		}
	}
}
