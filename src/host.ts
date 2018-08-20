import { Store } from 'redux'
import { IContainer, IAction, IPath, IPaths, IUnObserve, Dispatcher } from './container'
import { isImmutable } from './util'

export type Selector = (getState: HostContainer['getState']) => (...args: any[]) => any

export interface ISelectors {
  [k: string]: Selector
}

export interface IStores {
  [k: string]: Store<any, any>
}

export type IListener = (newValue: any) => void

export type IWatcher = (payload: any) => void

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
const isFunc = (a: any) => typeof a === 'function'

export class HostContainer implements IContainer {
  private static secretKey = '@@SECRET'
  private defaultKey: string = ''
  private stores: IStores
  private observables: { [storeKey: string]: IObservable[] } = {}
  private selectors: ISelectors = {}
  private selectorListeners: IObservable[] = []
  private executeJobs: IExecuteJob[] = []
  private watchingAction: { [type: string]: IWatcher[] } = {}

  constructor(stores: IStores | IStores[string], defaultKey?: string) {
    const isSingleStore = isFunc(stores.getState) && isFunc(stores.subscribe) && isFunc(stores.dispatch)
    if (isSingleStore) {
      defaultKey = HostContainer.secretKey
      stores = { [defaultKey]: stores as IStores[string] }
    }
    this.stores = stores as IStores
    if (defaultKey) {
      this.checkStoreKey(defaultKey)
      this.defaultKey = defaultKey
    }
    this.subscribeAllStore()
    Object.keys(stores).forEach(key => {
      this.observables[key] = []
    })
    this.observe = this.observe.bind(this)
    this.dispatch = this.dispatch.bind(this)
    this.getState = this.getState.bind(this)
    this.defineSelectors = this.defineSelectors.bind(this)
    this.watchAction = this.watchAction.bind(this)
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
    if (this.defaultKey) {
      const store = stores[this.defaultKey]
      const { dispatch } = store
      const newdispatch: any = (action: IAction) => {
        if (this.watchingAction[action.type]) {
          this.watchingAction[action.type].forEach(watcher => watcher.call(null, action.payload))
        }
        return dispatch(action)
      }
      store.dispatch = newdispatch
    }
    Object.keys(stores).forEach(key => {
      const store = stores[key]
      store.subscribe(() => {
        this.observables[key].forEach(observable => {
          const newValue = observable.getValue()
          if (this.hasChanged(observable, newValue)) {
            if (!observable.combinePrevValue) {
              observable.listener.call(null, newValue)
            } else {
              const targetJob = arrayFind<IExecuteJob>(this.executeJobs, job => job.fn === observable.listener)
              if (targetJob) {
                targetJob.newValue = {
                  ...targetJob.newValue,
                  ...newValue
                }
              } else {
                const prevValue = observable.combinePrevValue()
                this.executeJobs.push({
                  newValue: {
                    ...prevValue,
                    ...newValue
                  },
                  prevValue,
                  fn: observable.listener
                })
              }
            }
            observable.prevValue = newValue
          }
        })
        this.executeJobs.forEach(({ fn, newValue }) => fn.call(null, newValue))
        this.executeJobs.length = 0
      })
    })
  }

  private pushSingleObservable(storeKey: string, observable: IObservable): IUnObserve {
    this.observables[storeKey].push(observable)
    return () => {
      this.observables[storeKey] = this.observables[storeKey].filter(o => o !== observable)
    }
  }

  private checkSelectorKey(key: string): void {
    if (!has(this.selectors, key)) {
      throw new TypeError(`未被注册的 selector: ${key}`)
    }
  }

  private checkStoreKey(key: string): void {
    if (!this.stores[key]) {
      throw new TypeError(`未找到名为 ${key} 的 store`)
    }
  }

  private getValueByKeys(state: any, keys: string[]): any {
    if (!keys.length) {
      return state
    }
    try {
      keys.forEach(key => {
        if (isImmutable(state)) {
          state = state.get(key)
        } else {
          state = state[key]
        }
      })
    } catch {
      state = undefined
    }
    return state
  }

  private generateObservable(getValue: () => any, listener: IListener, shouldExecute = true): IObservable {
    const prevValue = getValue()
    if (shouldExecute) {
      listener.call(null, prevValue)
    }
    return {
      getValue,
      prevValue,
      listener
    }
  }

  private getPath(path: string): [string, string] {
    const result = path.split('#')
    if (result.length < 2 && this.defaultKey) {
      return [this.defaultKey, path]
    }
    return path.split('#') as [string, string]
  }

  /**
   * 获取返回某个 store 上特定路径的值的函数
   * @param storeKey 目标 store 的 key
   * @param keysStr 获取路径，以 '.' 分隔
   */
  private path2Func(storeKey: string, keysStr: string | undefined): () => any {
    this.checkStoreKey(storeKey)
    if (!keysStr) {
      return () => this.stores[storeKey].getState()
    }
    const keys = keysStr.split('.')
    return () => this.getValueByKeys(this.stores[storeKey].getState(), keys)
  }

  /**
   * 返回解析后的 selector 和 传入参数
   * @param selectorKey observe 的 selector 路径，包含标识符 '$'
   */
  private selector2Func(selectorKey: string): () => any {
    selectorKey = selectorKey.slice(1).trim()
    if (!/\(.*\)/.test(selectorKey)) {
      throw new TypeError('selector 中必须为执行表达式')
    }
    let selector = ''
    let argStr = ''
    let keys: string[]
    try {
      const matchArr = selectorKey.match(/^(\w+)\((.*)\)((\.\w+)*)$/) as RegExpMatchArray
      selector = matchArr[1]
      argStr = matchArr[2]
      keys = matchArr[3].split('.').filter(s => s)
    } catch (e) {
      throw new TypeError(`无法解析的 selector: $${selectorKey}`)
    }
    let args: any[]
    // 参数解析策略暂时是只能用 JSON 解析
    try {
      args = JSON.parse(`[${argStr}]`)
    } catch (e) {
      throw new TypeError(`不能转为 JSON 的 selector 参数: ${argStr}`)
    }
    this.checkSelectorKey(selector)
    return () => this.getValueByKeys(this.selectors[selector](this.getState)(...args), keys)
  }

  /**
   *
   * @param path observe 路径，以 '$' 开头表明为 selector, 若为 Map 则 listener 中接受相关 Map 组合的值
   * @param listener 监听器函数, observe 值变化时被调用, 接受 observe 的值
   */
  public observe(path: string, callback: IListener): IUnObserve
  public observe(path: IPaths, callback: (change: { [k in keyof IPaths]: any }) => void): IUnObserve
  public observe(path: IPath, listener: IListener): IUnObserve {
    if (typeof path === 'string') {
      if (path[0] === '$') {
        const observable = this.generateObservable(this.selector2Func(path), listener)
        this.selectorListeners.push(observable)
        return () => {
          this.selectorListeners = this.selectorListeners.filter(k => k !== observable)
        }
      }
      const [storeKey, keysStr] = this.getPath(path)
      const observable = this.generateObservable(this.path2Func(storeKey, keysStr), listener)
      return this.pushSingleObservable(storeKey, observable)
    }
    const allObservables: IObservable[] = []
    const unsubscribe = Object.keys(path).map(mainKey => {
      const [storeKey, keysStr] = this.getPath(path[mainKey])
      const accessFunc = this.path2Func(storeKey, keysStr)
      const getValue = () => ({
        [mainKey]: accessFunc()
      })
      const observable = this.generateObservable(getValue, listener, false)
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

  /**
   * 与 redux 的 dispatch 相似
   * @param action store 字段为目标 dispatch 的 store
   */
  public dispatch(action: IAction | Dispatcher): void {
    if (typeof action === 'function') {
      return // todo: dispatch到默认store上
    }
    const { type, payload } = action
    const store = action.store || this.defaultKey
    this.checkStoreKey(store)
    this.stores[store].dispatch({ type, payload })
    this.selectorListeners.forEach(observable => {
      const newValue = observable.getValue()
      if (newValue !== observable.prevValue) {
        observable.prevValue = newValue
        observable.listener.call(null, newValue)
      }
    })
  }

  /**
   * 获取某个 store 上或某个 selector 的值
   * @param path 以 '$' 开头为 selector 路径
   */
  public getState(path?: string): any {
    if (!path) {
      if (!this.defaultKey) {
        throw new TypeError('当前为多个 store，请指定某一个')
      }
      return this.stores[this.defaultKey].getState()
    }
    if (path[0] === '$') {
      return this.selector2Func(path)()
    }
    const [storeKey, keysStr] = this.getPath(path)
    return this.path2Func(storeKey, keysStr)()
  }

  /**
   * 注册 selector 工厂函数
   * @param selectors
   */
  public defineSelectors(selectors: ISelectors): void {
    this.selectors = {
      ...this.selectors,
      ...selectors
    }
  }

  public watchAction(type: any, watcher: IWatcher): IUnObserve {
    if (type.toString) {
      type = type.toString()
    }
    if (!this.defaultKey) {
      throw new TypeError('仅在具有默认 store 时有效')
    }
    if (this.watchingAction[type]) {
      this.watchingAction[type].push(watcher)
    } else {
      this.watchingAction[type] = [watcher]
    }
    return () => {
      this.watchingAction[type] = this.watchingAction[type].filter((k: IWatcher) => k !== watcher)
    }
  }
}
