import { createNewStore, initState } from './stores'
import { HostContainer } from '../src/host'
import { setName, setCity, reset, setAge, StoreType, createTester } from './stores/createHostTester'

const container = new HostContainer(
  {
    storeA: createNewStore(),
    storeB: createNewStore()
  },
  'storeA'
)
const { dispatch, observe, getState } = createTester(container)

describe('basic dispatch', () => {
  it('get redux store state', () => {
    expect(container.getState('storeA#locale.city')).toBe(initState.locale.city)
    expect(container.getState('storeB#name')).toBe(initState.name)
  })
  it('dispatch correctly', () => {
    dispatch(setName('Tom'))
    expect(getState('storeA#name')).toBe('Tom')
    dispatch(setCity('Beijing'), StoreType.B)
    expect(getState('storeB#locale.city')).toBe('Beijing')
  })
})

describe('basic observing keys', () => {
  beforeEach(() => {
    dispatch(reset())
    dispatch(reset(), StoreType.B)
    fn.mockClear()
  })
  const fn = jest.fn()
  const unsub = observe('storeA#age', fn)
  it('called immediately when observed', () => {
    observe('storeA#name', fn)()
    expect(fn).toHaveBeenCalledWith(initState.name)
  })
  it('observing deep keys', () => {
    const cancel = observe('storeA#locale.city', fn)
    expect(fn).toBeCalledWith(initState.locale.city)
    dispatch(setCity('Beijing'))
    expect(fn).toBeCalledWith('Beijing')
    cancel()
  })
  it('called when observed value changed', () => {
    dispatch(setAge(30))
    expect(fn).toHaveBeenCalledWith(30)
  })
  it('lazy calling', () => {
    for (let i = 0; i < 10; i++) {
      dispatch(setAge(30))
    }
    expect(fn).toHaveBeenCalledTimes(1)
  })
  it('unsuscribe', () => {
    unsub()
    expect(fn).not.toBeCalled()
  })
  it('when called correctly', () => {
    dispatch(setName('Tony'))
    expect(fn).not.toBeCalled()
    dispatch(setAge(10))
    expect(fn).not.toBeCalled()
  })
  describe('useful error messages', () => {
    it('dispatch none-exist store', () => {
      expect(() => {
        container.dispatch({
          ...setAge(10),
          store: 'storeC'
        })
      }).toThrow('未找到名为 storeC 的 store')
    })
    it('getState from none-exist store', () => {
      expect(() => {
        getState('storeC#')
      }).toThrow('未找到名为 storeC 的 store')
    })
  })
})

describe('default key', () => {
  dispatch(reset())
  dispatch(reset(), StoreType.B)
  it('get default store state', () => {
    expect(getState()).toBe(initState)
  })
  it('dispatch default store', () => {
    dispatch(setAge(10))
    expect(getState('age')).toBe(10)
  })
  it('observe default store', () => {
    const fn = jest.fn()
    const unob = observe('age', fn)
    expect(fn).toHaveBeenCalledWith(10)
    fn.mockClear()
    dispatch(setAge(20))
    expect(fn).toHaveBeenCalledWith(20)
    unob()
  })
})

describe('watching action', () => {
  const fn = jest.fn()
  const unwatch = container.watch('SET_AGE', fn)
  beforeEach(() => {
    fn.mockClear()
  })
  it('basic', () => {
    dispatch(setAge(20))
    expect(fn).toHaveBeenCalledWith(20)
  })
  it('not lazy calling', () => {
    dispatch(setAge(20))
    expect(fn).toHaveBeenCalledWith(20)
  })
  it('unwatch', () => {
    unwatch()
    dispatch(setAge(20))
    expect(fn).not.toHaveBeenCalled()
  })
  it('to string', () => {
    const fnStr = {}
    fnStr.toString = () => 'SET_NAME'
    container.watch(fnStr, fn)
    dispatch(setName('QAQ'))
    expect(fn).toHaveBeenCalledWith('QAQ')
  })
})

describe('interceptor', () => {
  const fn = jest.fn()
  const interceptor = container.createInterceptor(payload => typeof payload === 'number' && payload > 30)
  interceptor.watch('SET_AGE', fn)
  beforeEach(() => {
    fn.mockClear()
  })
  it('watch normally', () => {
    dispatch(setAge(40))
    expect(fn).toHaveBeenCalledWith(40)
  })
  it('intercept', () => {
    dispatch(setAge(20))
    expect(fn).not.toHaveBeenCalled()
  })
  it('destroy', () => {
    interceptor.destroy()
    setAge(20)
    setAge(40)
    expect(fn).not.toHaveBeenCalled()
  })
})
