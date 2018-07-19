export interface IAction {
	type: string
	store: string
	payload: any
}

export type ICallback = (change: any) => void

export type IUnObserve = () => void

export interface IPaths {
	[k: string]: string
}

export type IPath = string | IPaths

export interface IContainer {
	observe(path: string, callback: ICallback): IUnObserve
	observe(path: IPaths, callback: (change: { [k in keyof IPaths]: any }) => void): IUnObserve
	dispatch(action: IAction): void
}
