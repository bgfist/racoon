export interface IAction {
	type: string
	store: string
	payload: any
}

export interface IPaths {
	[k: string]: string
}

export type IChange = any

export type IChanges<T> = { [P in keyof T]: IChange }

export interface IContainer {
	observe(path: string, listener: (change: IChange) => void): void
	observe<T extends IPaths>(path: T, listener: (changes: IChanges<T>) => void): void
	dispatch(action: IAction): IAction
}
