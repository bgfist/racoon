import { ClientContainer, IConnection } from '../src/client'
import differ = require('../src/diff')

jest.mock('../src/diff')
differ.diff = jest.fn((lhs, rhs) => rhs)
differ.applyPatch = jest.fn((lhs, patches) => patches)

describe('client-side clientContainer', () => {
  const postMessage = jest.fn().mockName('postMessage')
  let receiveMessage
  let mid = -1

  const bridge: IConnection = {
    postMessage(message: string) {
      postMessage.mockClear()
      postMessage(JSON.parse(message))
      mid++
    },
    handleMessage(onmessage) {
      receiveMessage = jest.fn(message => onmessage(JSON.stringify(message)))
    }
  }

  const clientContainer = new ClientContainer(bridge)

  describe('call method/send message', () => {
    test('fetchState', () => {
      clientContainer.fetchState('aaa')
      expect(postMessage).toBeCalledWith({
        mid,
        type: '@@fetch',
        path: 'aaa'
      })
    })

    test('observe/unobserve', () => {
      const unobserve = clientContainer.observe('bbb', jest.fn())
      expect(postMessage).toBeCalledWith({
        mid,
        type: '@@observe',
        path: 'bbb'
      })
      const observeMid = mid

      unobserve()
      expect(postMessage).toBeCalledWith({
        mid,
        type: '@@unobserve',
        observeMid
      })
    })

    test('watch/unwatch', () => {
      const unwatch = clientContainer.watch('bbb', jest.fn())
      expect(postMessage).toBeCalledWith({
        mid,
        type: '@@watch',
        actionType: 'bbb'
      })
      const watchMid = mid

      unwatch()
      expect(postMessage).toBeCalledWith({
        mid,
        type: '@@unwatch',
        watchMid
      })
    })

    test('dispatch', () => {
      clientContainer.dispatch({ type: 'a', store: 'a', payload: 'a' })
      expect(postMessage).toBeCalledWith({
        mid,
        type: '@@dispatch',
        action: { type: 'a', store: 'a', payload: 'a' }
      })
    })
  })

  describe('call method/receive message/get result', () => {
    test('fetchState/feedback', () => {
      const res = clientContainer.fetchState('aaa')
      receiveMessage({
        mid,
        type: '@@feedback',
        value: 5
      })
      expect(res).resolves.toBe(5)
    })

    test('observe/change/unobserve', () => {
      const onchange = jest.fn().mockName('onChange')
      const unobserve = clientContainer.observe('aaa', onchange)
      receiveMessage({
        mid,
        type: '@@change',
        value: 5
      })
      expect(onchange).toBeCalledWith(5)
      onchange.mockClear()

      receiveMessage({
        mid,
        type: '@@change',
        value: 6
      })
      onchange.mockClear()

      unobserve()
      receiveMessage({
        mid,
        type: '@@change',
        value: 6
      })
      receiveMessage({
        mid,
        type: '@@change',
        value: 7
      })
      expect(onchange).toHaveBeenCalledTimes(0)
    })

    test('dispatch/resCb', () => {
      const resCb = jest.fn().mockName('dispatch resCb')
      clientContainer.dispatch({ type: '#' }, resCb)
      receiveMessage({
        mid,
        type: '@@dispatchRes',
        res: '#'
      })
      expect(resCb).toBeCalledWith('#')
    })

    test('watch/payload/unwatch', () => {
      const onaction = jest.fn().mockName('onAction')
      const unwatch = clientContainer.watch('', onaction)
      receiveMessage({
        mid,
        type: '@@action',
        payload: 5
      })
      expect(onaction.mock.calls[0][0]).toBe(5)
      onaction.mockClear()

      receiveMessage({
        mid,
        type: '@@action',
        payload: 6
      })
      onaction.mockClear()

      unwatch()
      receiveMessage({
        mid,
        type: '@@action',
        payload: 6
      })
      receiveMessage({
        mid,
        type: '@@action',
        payload: 7
      })
      expect(onaction).toHaveBeenCalledTimes(0)
    })

    test('watch/resCb', () => {
      const onaction = jest
        .fn((_, resCb) => {
          resCb('#')
        })
        .mockName('onAction')
      clientContainer.watch('', onaction)
      const watchMid = mid
      receiveMessage({
        mid,
        type: '@@action',
        payload: 5
      })
      expect(postMessage).toBeCalledWith({
        mid,
        type: '@@watchRes',
        res: '#',
        watchMid
      })
    })
  })
})

describe('host-side clientContainer', () => {
  const postMessage = jest.fn().mockName('postMessage')
  let receiveMessage
  let emitChange

  const bridge: IConnection = {
    postMessage(message: string) {
      postMessage.mockClear()
      postMessage(JSON.parse(message))
    },
    handleMessage(onmessage) {
      receiveMessage = jest.fn(message => onmessage(JSON.stringify(message)))
    }
  }

  const hostContainer = {
    getState: jest.fn(() => 1).mockName('hostContainer.getState'),
    observe: jest
      .fn((path: any, handler) => {
        emitChange = handler
        return () => {
          emitChange = jest.fn()
        }
      })
      .mockName('hostContainer.observe'),
    dispatch: jest.fn().mockName('hostContainer.dispatch'),
    watch: jest.fn().mockName('hostContainer.watch')
  }

  // @ts-ignore
  // tslint:disable-next-line
  new ClientContainer(bridge, hostContainer)

  describe('receive message/invoke service/send message', () => {
    test('fetchState/feedback', () => {
      const receiveMid = 10000
      receiveMessage({
        mid: receiveMid,
        type: '@@fetch',
        path: '#'
      })
      expect(hostContainer.getState).toBeCalledWith('#')
      expect(postMessage).toBeCalledWith({
        mid: receiveMid,
        type: '@@feedback',
        value: 1
      })
    })

    test('observe/change/unobserve', () => {
      const receiveMid = 20000
      receiveMessage({
        mid: receiveMid,
        type: '@@observe',
        path: '#'
      })
      expect(hostContainer.observe.mock.calls[0][0]).toBe('#')
      emitChange(5)
      expect(postMessage).toBeCalledWith({
        mid: receiveMid,
        type: '@@change',
        value: 5
      })
      emitChange(6)
      expect(postMessage).toBeCalledWith({
        mid: receiveMid,
        type: '@@change',
        value: 6
      })

      postMessage.mockClear()
      receiveMessage({
        mid: receiveMid + 1,
        type: '@@unobserve',
        observeMid: 20000
      })
      emitChange(7)
      emitChange(8)
      expect(postMessage).toHaveBeenCalledTimes(0)
    })

    test('dispatch', () => {
      const receiveMid = 30000
      receiveMessage({
        mid: receiveMid,
        type: '@@dispatch',
        action: '#'
      })
      expect(hostContainer.dispatch.mock.calls[0][0]).toBe('#')
    })

    test('watch', () => {
      const receiveMid = 40000
      receiveMessage({
        mid: receiveMid,
        type: '@@watch',
        actionType: '#'
      })
      expect(hostContainer.watch.mock.calls[0][0]).toBe('#')
    })
  })
})
