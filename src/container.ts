export interface IAction {
  type: string
  store?: string
  payload?: any
}

export type Dispatch = (action: IAction | Dispatcher) => void
export type Dispatcher = (dispatch: Dispatch) => void

export type IListener = (change: any) => void
export type IUnObserve = () => void

export type IWatcher = (payload: any) => void
export type IUnWatch = () => void

export interface IPaths {
  [k: string]: string
}

export type IPath = string | IPaths

export interface IContainer {
  observe(path: string, listener: IListener): IUnObserve
  observe(path: IPaths, listener: (change: { [k in keyof IPaths]: any }) => void): IUnObserve
  watch(type: any, watcher: IWatcher): IUnWatch
  dispatch: Dispatch
}
