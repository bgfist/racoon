export type ArgType<T> = T extends (arg: infer U) => any ? U : any

export interface IAction {
  type: string
  store?: string
  payload?: any
}

export type Dispatch = (action: IAction | Dispatcher) => void
export type Dispatcher = (dispatch: Dispatch) => void

export type IListener = (change: any) => void
export type IUnObserve = () => void

export type IWatcher<T = any> = (payload: ArgType<T>) => void
export type IUnWatch = () => void

export interface IPaths {
  [k: string]: string
}

export type IPath = string | IPaths

export interface IContainer {
  observe(path: string, listener: IListener): IUnObserve
  observe(path: IPaths, listener: (change: { [k in keyof IPaths]: any }) => void): IUnObserve
  watch<T>(type: T, watcher: IWatcher<T>): IUnWatch
  dispatch: Dispatch
}
