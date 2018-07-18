import { Promise } from 'es6-promise'
import { IContainer, ICallback, IAction } from './container'
import { HostContainer } from './host'

export type Messager = (message: string) => void

export interface IConnection {
	handleMessage: (onmessage: Messager) => void
	postMessage: Messager
}

interface IMessage {
	mid: number
	type: string
}

interface IObserveMessage extends IMessage {
	type: 'observe'
	path: string
}

interface IChangeMessage extends IMessage {
	type: 'change'
	value: any
}

interface IFetchMessage extends IMessage {
	type: 'fetch'
	path: string
}

interface IFeedbackMessage extends IMessage {
	type: 'feedback'
	value: any
}

interface IActionMessage extends IMessage {
	type: 'action'
	action: IAction
}

type Message = IObserveMessage | IChangeMessage | IFetchMessage | IFeedbackMessage | IActionMessage

export class ClientContainer implements IContainer {
	private postMessage: Messager
	private host?: HostContainer
	private callbacks: ICallback[]
	private mid: number

	constructor(conn: IConnection, host?: HostContainer) {
		this.host = host
		this.callbacks = []
		this.mid = 0
		this.postMessage = conn.postMessage.bind(conn)
		conn.handleMessage(this.handleMessage)
	}

	public observe(path: string, callback: ICallback) {
		const mid = this._genMid()
		const observeMessage: IObserveMessage = { mid, path, type: 'observe' }
		this.callbacks[mid] = callback
		this.postMessage(JSON.stringify(observeMessage))
		return () => {
			delete this.callbacks[mid]
		}
	}

	public fetchState(path: string): Promise<any> {
		const mid = this._genMid()
		const fetchMessage: IFetchMessage = { mid, path, type: 'fetch' }
		this.postMessage(this._pack(fetchMessage))
		return new Promise(resolve => {
			this.callbacks[mid] = (change: any) => resolve(change)
		})
	}

	public dispatch(action: IAction) {
		const mid = this._genMid()
		const actionMessage: IActionMessage = { mid, action, type: 'action' }
		this.postMessage(this._pack(actionMessage))
	}

	private _genMid() {
		return this.mid++
	}

	private _pack(message: Message) {
		return JSON.stringify(message)
	}

	private _unpack(info: string) {
		return JSON.parse(info) as Message
	}

	private _observe(message: IObserveMessage) {
		if (this.host) {
			const { mid, path } = message
			this.host.observe(path, value => {
				const changeMessage: IChangeMessage = { mid, type: 'change', value }
				this.postMessage(this._pack(changeMessage))
			})
		}
	}

	private _fetchState(message: IFetchMessage) {
		if (this.host) {
			const { mid, path } = message
			const value = this.host.getState(path)
			const feedbackMessage: IFeedbackMessage = { mid, type: 'feedback', value }
			this.postMessage(this._pack(feedbackMessage))
		}
	}

	private _dispatch(message: IActionMessage) {
		if (this.host) {
			const { action } = message
			this.host.dispatch(action)
		}
	}

	private _onChange(message: IChangeMessage) {
		const { mid, value } = message
		if (this.callbacks[mid]) {
			this.callbacks[mid](value)
		}
	}

	private _onFeedback(message: IFeedbackMessage) {
		const { mid, value } = message
		if (this.callbacks[mid]) {
			this.callbacks[mid](value)
			delete this.callbacks[mid]
		}
	}

	private handleMessage(info: string) {
		const message = this._unpack(info)
		switch (message.type) {
			case 'observe':
				this._observe(message)
				break
			case 'change':
				this._onChange(message)
				break
			case 'fetch':
				this._fetchState(message)
				break
			case 'feedback':
				this._onFeedback(message)
				break
			case 'action':
				this._dispatch(message)
				break
		}
	}
}
