// @ts-ignore
// tslint:disable-next-line
import corePromise = require('core-js/library/fn/promise')
import { IContainer, IListener, IAction, Dispatcher, IUnObserve, IPath, IPaths, IWatcher, IUnWatch } from './container'
import { HostContainer } from './host'
import { diff, applyPatch } from './diff'

export type Messager = (message: string) => void

export interface IConnection {
  handleMessage: (onmessage: Messager) => void
  postMessage: Messager
}

type MessageType =
  | '@@observe'
  | '@@unobserve'
  | '@@change'
  | '@@fetch'
  | '@@feedback'
  | '@@dispatch'
  | '@@error'
  | '@@watch'
  | '@@unwatch'
  | '@@action'

interface IMessage {
  mid: number
  type: MessageType
}

interface IObserveMessage extends IMessage {
  type: '@@observe'
  path: IPath
}

interface IUnObserveMessage extends IMessage {
  type: '@@unobserve'
  observeMid: number
}

interface IChangeMessage extends IMessage {
  type: '@@change'
  value: any
}

interface IFetchMessage extends IMessage {
  type: '@@fetch'
  path: string
}

interface IFeedbackMessage extends IMessage {
  type: '@@feedback'
  value: any
}

interface IDispatchMessage extends IMessage {
  type: '@@dispatch'
  action: IAction
}

interface IErrorMessage extends IMessage {
  type: '@@error'
  reason: string
}

interface IWatchMessage extends IMessage {
  type: '@@watch'
  actionType: string
}

interface IActionMessage extends IMessage {
  type: '@@action'
  payload: any
}

interface IUnWatchMessage extends IMessage {
  type: '@@unwatch'
  watchMid: number
}

type Message =
  | IObserveMessage
  | IUnObserveMessage
  | IChangeMessage
  | IFetchMessage
  | IFeedbackMessage
  | IDispatchMessage
  | IErrorMessage
  | IWatchMessage
  | IActionMessage
  | IUnWatchMessage

interface IMessageCallbacks {
  [mid: number]: IListener
}

interface IUnObserveFuncs {
  [observeMid: number]: IUnObserve
}

interface IUnWatchFuncs {
  [watchMid: number]: IUnWatch
}

export class ClientContainer implements IContainer {
  private postMessage: Messager
  private host?: HostContainer
  private callbacks: IMessageCallbacks
  private unobserveFuncs: IUnObserveFuncs
  private unwatchFuncs: IUnWatchFuncs
  private mid: number

  constructor(conn: IConnection, host?: HostContainer) {
    this.host = host
    this.callbacks = {}
    this.unobserveFuncs = {}
    this.unwatchFuncs = {}
    this.mid = 0
    this.postMessage = conn.postMessage
    conn.handleMessage(this.handleMessage.bind(this))
  }

  public observe(path: string, listener: IListener): IUnObserve
  public observe(path: IPaths, listener: (change: { [k in keyof IPaths]: any }) => void): IUnObserve
  public observe(path: IPath, listener: IListener) {
    const mid = this.genMid()
    const observeMessage: IObserveMessage = { mid, path, type: '@@observe' }

    const observer = (() => {
      let observable: any
      return (change: any) => {
        try {
          observable = applyPatch(observable, change)
        } catch (e) {
          this.error(`applyPatch: ${e.message}`)
          return
        }
        listener(observable)
      }
    })()
    this.callbacks[mid] = observer
    this.postMessage(this.pack(observeMessage))

    return () => {
      delete this.callbacks[mid]
      const $mid = this.genMid()
      const unObserveMessage: IUnObserveMessage = { mid: $mid, type: '@@unobserve', observeMid: mid }
      this.postMessage(this.pack(unObserveMessage))
    }
  }

  public watch<T>(type: T, watcher: IWatcher<T>) {
    const mid = this.genMid()
    const watchMessage: IWatchMessage = { mid, type: '@@watch', actionType: type.toString() }

    this.callbacks[mid] = watcher
    this.postMessage(this.pack(watchMessage))

    return () => {
      delete this.callbacks[mid]
      const $mid = this.genMid()
      const unWatchMessage: IUnWatchMessage = { mid: $mid, type: '@@unwatch', watchMid: mid }
      this.postMessage(this.pack(unWatchMessage))
    }
  }

  public fetchState(path: string): Promise<any> {
    const mid = this.genMid()
    const fetchMessage: IFetchMessage = { mid, path, type: '@@fetch' }
    this.postMessage(this.pack(fetchMessage))
    return new corePromise((resolve: any) => {
      this.callbacks[mid] = (change: any) => resolve(change)
    })
  }

  public dispatch = (action: IAction | Dispatcher) => {
    if (typeof action === 'function') {
      return action(this.dispatch)
    }
    const mid = this.genMid()
    const dispatchMessage: IDispatchMessage = { mid, action, type: '@@dispatch' }
    this.postMessage(this.pack(dispatchMessage))
  }

  public destory() {
    this.mid = 0
    this.callbacks = {}
    Object.keys(this.unobserveFuncs).forEach((observeMid: any) => this.unobserveFuncs[observeMid]())
    this.unobserveFuncs = {}
    Object.keys(this.unwatchFuncs).forEach((watchMid: any) => this.unwatchFuncs[watchMid]())
    this.unwatchFuncs = {}
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
        // 若重复监听，取消之前的
        if (this.unobserveFuncs[observeMid]) {
          this.unobserveFuncs[observeMid]()
        }

        const observer = (() => {
          let observable: any
          return (change: any) => {
            let patch: any
            try {
              patch = diff(observable, change)
            } catch (e) {
              this.error(`diff: ${e.message}`)
              return
            }
            const changeMessage: IChangeMessage = { mid, type: '@@change', value: patch }
            this.postMessage(this.pack(changeMessage))
            observable = change
          }
        })()
        const unobserve = this.host.observe(path as any, observer)
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

  private onWatch(message: IWatchMessage) {
    if (this.host) {
      const { mid, actionType, mid: watchMid } = message
      try {
        // 若重复监听，取消之前的
        if (this.unwatchFuncs[watchMid]) {
          this.unwatchFuncs[watchMid]()
        }

        const watcher = (payload: any) => {
          const actionMessage: IActionMessage = { mid, type: '@@action', payload }
          this.postMessage(this.pack(actionMessage))
        }

        const unwatch = this.host.watch(actionType, watcher)
        this.unwatchFuncs[watchMid] = unwatch
      } catch (e) {
        this.error(`hostContainer.watch: ${e.message}`)
      }
    }
  }

  private onUnwatch(message: IUnWatchMessage) {
    const { watchMid } = message
    if (this.unwatchFuncs[watchMid]) {
      this.unwatchFuncs[watchMid]()
      delete this.unwatchFuncs[watchMid]
    }
  }

  private onAction(message: IActionMessage) {
    const { mid, payload } = message
    if (this.callbacks[mid]) {
      this.callbacks[mid](payload)
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
      const feedbackMessage: IFeedbackMessage = { mid, type: '@@feedback', value }
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
    const errorMessage: IErrorMessage = { mid, reason, type: '@@error' }
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
      return
    }
    switch (message.type) {
      case '@@observe':
        this.onObserve(message)
        break
      case '@@unobserve':
        this.onUnobserve(message)
        break
      case '@@change':
        this.onChange(message)
        break
      case '@@fetch':
        this.onFetchState(message)
        break
      case '@@feedback':
        this.onFeedback(message)
        break
      case '@@dispatch':
        this.onDispatch(message)
        break
      case '@@error':
        this.onError(message)
        break
      case '@@watch':
        this.onWatch(message)
        break
      case '@@unwatch':
        this.onUnwatch(message)
        break
      case '@@action':
        this.onAction(message)
        break
    }
  }
}
