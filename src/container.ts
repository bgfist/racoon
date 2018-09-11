export type ArgType<T> = T extends (arg: infer U) => any ? U : any

export interface IAction {
  type: string
  store?: string
  payload?: any
}

export type IListener = (change: any) => void
export type IUnObserve = () => void
export type IResCallback = (response: any) => void

export type IWatcher<T = any> = (payload: ArgType<T>, resCb: IResCallback) => void
export type IUnWatch = () => void
export type IFilter = (payload: any) => boolean

export interface IPaths {
  [k: string]: string
}

export type IPath = string | IPaths

export interface IContainer {
  observe(path: string, listener: IListener): IUnObserve
  observe(path: IPaths, listener: (change: { [k in keyof IPaths]: any }) => void): IUnObserve
  watch<T>(type: T, watcher: IWatcher<T>): IUnWatch
  createInterceptor(fn?: IFilter): IInterceptor
  dispatch(action: IAction, resCb?: IResCallback): void
  destroy(): void
}

export interface IInterceptor {
  watch<T>(type: T, watcher: IWatcher<T>): IUnWatch
  destroy(): void
}
