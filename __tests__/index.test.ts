import { storeA, storeB, initState, setAge, reset, setCity, setName, badAction } from './stores'
import { createHostContainer, createClientContainer } from '../src'

let onmessageA
let onmessageB
const bridgeA = {
  postMessage(message) {
    onmessageB(message)
  },
  handleMessage(onmmessage) {
    onmessageA = onmmessage
  }
}
const bridgeB = {
  postMessage(message) {
    onmessageA(message)
  },
  handleMessage(onmmessage) {
    onmessageB = onmmessage
  }
}

const hostContainer = createHostContainer({ storeA, storeB }, 'storeA')
hostContainer.defineSelectors({
  selectNameAndCity: getState => (upperCase = false) => {
    const state = getState('storeA#')
    const nameAndCity = `${state.name}-${state.locale.city}`
    return upperCase ? nameAndCity.toUpperCase() : nameAndCity
  }
})
const clientContainer = createClientContainer(bridgeA)
createClientContainer(bridgeB, hostContainer)

beforeEach(() => {
  storeA.dispatch(reset())
  storeB.dispatch(reset())
})

test('fetchState/feedback', () => {
  expect(clientContainer.fetchState('storeA')).resolves.toEqual(initState)
  expect(clientContainer.fetchState('storeA#name')).resolves.toBe(initState.name)
  expect(clientContainer.fetchState('storeA#locale.city')).resolves.toBe(initState.locale.city)
  expect(clientContainer.fetchState('storeA#unknown')).resolves.toBe(undefined)
  expect(clientContainer.fetchState('storeA#a.aa.a')).resolves.toBe(undefined)
})

test('observe/feedback', () => {
  const callback = jest.fn().mockName('onChange')

  clientContainer.observe('storeA#', callback)
  expect(callback).toBeCalledWith(initState)
  callback.mockClear()

  clientContainer.observe('storeA#name', callback)
  expect(callback).toBeCalledWith(initState.name)
  callback.mockClear()

  clientContainer.observe('storeA#locale.city', callback)
  expect(callback).toBeCalledWith(initState.locale.city)
  callback.mockClear()
})

test('dispatch/state changed', () => {
  clientContainer.dispatch({
    store: 'storeA',
    ...setAge(100)
  })
  expect(clientContainer.fetchState('storeA#age')).resolves.toBe(100)
})

test('dispatch thunk/state changed', () => {
  clientContainer.dispatch(dispatch =>
    dispatch({
      store: 'storeA',
      ...setAge(120)
    })
  )
  expect(clientContainer.fetchState('storeA#age')).resolves.toBe(120)
})

test('dispatch/change', () => {
  const callback = jest.fn().mockName('onChange')
  clientContainer.observe('storeA#locale.city', callback)
  clientContainer.dispatch({
    store: 'storeA',
    ...setCity('Beijing')
  })
  expect(callback).toBeCalledWith('Beijing')
  callback.mockClear()
  clientContainer.dispatch({
    store: 'storeA',
    ...setCity('New York')
  })
  expect(callback).toBeCalledWith('New York')
})

test('dispatch/bad action', () => {
  const callback = jest.fn().mockName('onChange')
  clientContainer.observe('storeA#locale.city', callback)
  clientContainer.dispatch({
    store: 'storeA',
    ...badAction('Shenzhen')
  })
  expect(callback).toBeCalledWith(null)
})

test('observe multi', () => {
  const callback = jest.fn().mockName('onChange')
  clientContainer.observe({ city: 'storeA#locale.city', name: 'storeB#name' }, callback)
  clientContainer.dispatch({
    store: 'storeA',
    ...setCity('Beijing')
  })
  expect(callback).toBeCalledWith({ city: 'Beijing', name: initState.name })
  callback.mockClear()
  clientContainer.dispatch({
    store: 'storeB',
    ...setName('Jack')
  })
  expect(callback).toBeCalledWith({ city: 'Beijing', name: 'Jack' })
})

test('selector', () => {
  expect(clientContainer.fetchState('$selectNameAndCity(false)')).resolves.toBe(`${initState.name}-${initState.locale.city}`)
  expect(clientContainer.fetchState('$selectNameAndCity(true)')).resolves.toBe(`${initState.name}-${initState.locale.city}`.toUpperCase())

  const callback = jest.fn().mockName('onChange')
  clientContainer.observe('$selectNameAndCity()', callback)
  expect(callback).toBeCalledWith(`${initState.name}-${initState.locale.city}`)
  callback.mockClear()
  clientContainer.dispatch({
    store: 'storeA',
    ...setCity('Changsha')
  })
  expect(callback).toBeCalledWith(`${initState.name}-Changsha`)
  callback.mockClear()
  clientContainer.dispatch({
    store: 'storeA',
    ...setName('Jack')
  })
  expect(callback).toBeCalledWith(`Jack-Changsha`)
  callback.mockClear()
  clientContainer.dispatch({
    store: 'storeA',
    ...setAge(4)
  })
  expect(callback).toHaveBeenCalledTimes(0)
  clientContainer.dispatch({
    store: 'storeA',
    ...reset()
  })
  expect(callback).toBeCalledWith(`${initState.name}-${initState.locale.city}`)
})

test('watch/action', () => {
  const watcher = jest.fn().mockName('onAction')
  const unwatch = clientContainer.watch(setAge, watcher)
  clientContainer.dispatch(setAge(85))
  expect(watcher.mock.calls[0][0]).toBe(85)
  watcher.mockClear()
  clientContainer.dispatch(setAge(86))
  expect(watcher.mock.calls[0][0]).toBe(86)
  watcher.mockClear()
  hostContainer.dispatch(setAge(87))
  expect(watcher.mock.calls[0][0]).toBe(87)
  watcher.mockClear()

  unwatch()
  clientContainer.dispatch(setAge(88))
  expect(watcher).not.toBeCalled()
})

describe('watch/dispatch service', () => {
  test('host watch/client dispatch', () => {
    const resCb = jest.fn().mockName('dispatch resCb')
    hostContainer.watch('#', (_, resCb) => {
      resCb('#')
    })
    clientContainer.dispatch({ type: '#' }, resCb)
    expect(resCb).toBeCalledWith('#')
  })

  test('client watch/host dispatch', () => {
    const resCb = jest.fn().mockName('dispatch resCb')
    clientContainer.watch('$', (_, resCb) => {
      resCb('$')
    })
    hostContainer.dispatch({ type: '$' }, resCb)
    expect(resCb).toBeCalledWith('$')
  })

  test('client watch/client dispatch', () => {
    const resCb = jest.fn().mockName('dispatch resCb')
    clientContainer.watch('@', (_, resCb) => {
      resCb('@')
    })
    clientContainer.dispatch({ type: '@' }, resCb)
    expect(resCb).toBeCalledWith('@')
  })
})
