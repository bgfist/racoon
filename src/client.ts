import { IContainer, IAction } from './container'

export interface IHandler {
	handleFeedbak: () => void
	handleChange: () => void
}

export interface IConnection {
	handleMessage: (message: string, handler: IHandler) => void
	postMessage: (message: string) => void
}

export class ClientContainer implements IContainer {
	constructor(conn: IConnection) {
		throw new Error('unimplemented')
	}

	public observe(path: any, listener: any) {
		throw new Error('unimplemented')
	}

	public dispatch(action: IAction) {
		return action
	}

	public fetchState(path: string): Promise<any> {
		throw new Error('unimplemented')
	}
}
