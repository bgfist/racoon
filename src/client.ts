import { Promise } from 'es6-promise'
import { IContainer, ICallback, IAction, IUnObserve, IPath } from './container'
import { HostContainer } from './host'

export type Messager = (message: string) => void

export interface IConnection {
	handleMessage: (onmessage: Messager) => void
	postMessage: Messager
}

type MessageType = 'observe' | 'unobserve' | 'change' | 'fetch' | 'feedback' | 'dispatch' | 'error'

interface IMessage {
	mid: number
	type: MessageType
}

interface IObserveMessage extends IMessage {
	type: 'observe'
	path: IPath
}

interface IUnObserveMessage extends IMessage {
	type: 'unobserve'
	observeMid: number
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

interface IDispatchMessage extends IMessage {
	type: 'dispatch'
	action: IAction
}

interface IErrorMessage extends IMessage {
	type: 'error'
	reason: string
}

type Message = IObserveMessage | IUnObserveMessage | IChangeMessage | IFetchMessage | IFeedbackMessage | IDispatchMessage | IErrorMessage

interface IMessageCallbacks {
	[mid: number]: ICallback
}

interface IUnObserveFuncs {
	[observeMid: number]: IUnObserve
}

export class ClientContainer implements IContainer {
	private postMessage: Messager
	private host?: HostContainer
	private callbacks: IMessageCallbacks
	private unobserveFuncs: IUnObserveFuncs
	private mid: number

	constructor(conn: IConnection, host?: HostContainer) {
		this.host = host
		this.callbacks = {}
		this.unobserveFuncs = {}
		this.mid = 0
		this.postMessage = conn.postMessage
		conn.handleMessage(this.handleMessage.bind(this))
	}

	public observe(path: IPath, callback: ICallback) {
		const mid = this.genMid()
		const observeMessage: IObserveMessage = { mid, path, type: 'observe' }
		this.callbacks[mid] = callback
		this.postMessage(this.pack(observeMessage))

		return () => {
			delete this.callbacks[mid]
			const $mid = this.genMid()
			const unObserveMessage: IUnObserveMessage = { mid: $mid, type: 'unobserve', observeMid: mid }
			this.postMessage(this.pack(unObserveMessage))
		}
	}

	public fetchState(path: string): Promise<any> {
		const mid = this.genMid()
		const fetchMessage: IFetchMessage = { mid, path, type: 'fetch' }
		this.postMessage(this.pack(fetchMessage))
		return new Promise(resolve => {
			this.callbacks[mid] = (change: any) => resolve(change)
		})
	}

	public dispatch(action: IAction) {
		const mid = this.genMid()
		const dispatchMessage: IDispatchMessage = { mid, action, type: 'dispatch' }
		this.postMessage(this.pack(dispatchMessage))
	}

	private genMid() {
		return this.mid++
	}

	private pack(message: Message) {
		return JSON.stringify(message)
	}

	private unpack(info: string) {
		return JSON.parse(info) as Message
	}

	private onObserve(message: IObserveMessage) {
		if (this.host) {
			const { mid, path, mid: observeMid } = message
			try {
				const unobserve = this.host.observe(path, value => {
					const changeMessage: IChangeMessage = { mid, type: 'change', value }
					this.postMessage(this.pack(changeMessage))
				})
				this.unobserveFuncs[observeMid] = unobserve
			} catch (e) {
				this.error(`hostContainer.observe: ${e.message}`)
			}
		}
	}

	private onUnobserve(message: IUnObserveMessage) {
		const { observeMid } = message
		if (this.unobserveFuncs[observeMid]) {
			this.unobserveFuncs[observeMid]()
			delete this.unobserveFuncs[observeMid]
		}
	}

	private onChange(message: IChangeMessage) {
		const { mid, value } = message
		if (this.callbacks[mid]) {
			this.callbacks[mid](value)
		}
	}

	private onFetchState(message: IFetchMessage) {
		if (this.host) {
			const { mid, path } = message
			let value
			try {
				value = this.host.getState(path)
			} catch (e) {
				this.error(`hostContainer.getState: ${e.message}`)
			}
			const feedbackMessage: IFeedbackMessage = { mid, type: 'feedback', value }
			this.postMessage(this.pack(feedbackMessage))
		}
	}

	private onFeedback(message: IFeedbackMessage) {
		const { mid, value } = message
		if (this.callbacks[mid]) {
			this.callbacks[mid](value)
			delete this.callbacks[mid]
		}
	}

	private onDispatch(message: IDispatchMessage) {
		if (this.host) {
			const { action } = message
			try {
				this.host.dispatch(action)
			} catch (e) {
				this.error(`hostContainer.dispatch: ${e.message}`)
			}
		}
	}

	private error(reason: string) {
		const mid = this.genMid()
		const errorMessage: IErrorMessage = { mid, reason, type: 'error' }
		this.postMessage(this.pack(errorMessage))
	}

	private onError(message: IErrorMessage) {
		throw new Error(message.reason)
	}

	private handleMessage(info: string) {
		let message
		try {
			message = this.unpack(info)
		} catch (e) {
			this.error(`clientContainer: 消息格式错误: ${info} --- ${e.message}`)
			return
		}
		switch (message.type) {
			case 'observe':
				this.onObserve(message)
				break
			case 'unobserve':
				this.onUnobserve(message)
				break
			case 'change':
				this.onChange(message)
				break
			case 'fetch':
				this.onFetchState(message)
				break
			case 'feedback':
				this.onFeedback(message)
				break
			case 'dispatch':
				this.onDispatch(message)
				break
			case 'error':
				this.onError(message)
				break
			default:
				// @ts-ignore
				this.error(`clientContainer: 未知的消息类型: ${message.type}`)
				break
		}
	}
}
