export interface IAction {
	type: string
	store: string
	payload: any
}

export type ICallback = (change: any) => void

export type IUnObserve = () => void

export interface IContainer {
	observe(path: string, callback: ICallback): IUnObserve
	dispatch(action: IAction): void
}
