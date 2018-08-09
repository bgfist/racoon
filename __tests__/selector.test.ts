import { storeA, storeB, initState, setDelay } from './stores'
import { HostContainer } from '../src/host'
import { setName, setCity, reset, setAge, StoreType, createTester, setIdentity } from './stores/createHostTester'

const hostContainer = new HostContainer({
  storeA,
  storeB
})

const { dispatch, getState, observe } = createTester(hostContainer)
const fn = jest.fn()

describe.only('basic selector observer', () => {
  hostContainer.defineSelectors({
    computedDescribe: getStoreState => ({
      select: (connector: string) => {
        const state = getStoreState('storeA')
        return `${state.name}${connector}${state.age}`
      },
      affected: ['storeA#age', 'storeA#name']
    })
  })
  const unsub = observe('$computedDescribe("-")', fn)
  beforeEach(() => {
    dispatch(reset())
    dispatch(reset(), StoreType.B)
    fn.mockClear()
  })
  it('called immediately', () => {
    observe('$computedDescribe("-")', fn)()
    expect(fn).toHaveBeenCalledTimes(1)
  })
  it('get selector state', () => {
    expect(getState('$computedDescribe("-")')).toBe(`${initState.name}-${initState.age}`)
  })
  it('observe one selector', () => {
    const fn2 = jest.fn()
    dispatch(
      setIdentity({
        name: 'Henrry',
        age: 40
      })
    )
    fn.mockClear()
    observe('$computedDescribe("-")', fn2)()
    expect(fn).not.toHaveBeenCalled()
    expect(fn2).toHaveBeenCalledWith(`Henrry-40`)
  })
  it('called when on key changed', () => {
    dispatch(setAge(23))
    expect(fn).toHaveBeenCalledWith(`${initState.name}-23`)
    dispatch(setName('Marry'))
    expect(fn).toHaveBeenCalledWith('Marry-23')
  })
  it('only called once when multiple observing-values changed', () => {
    dispatch(
      setIdentity({
        name: 'Henrry',
        age: 40
      })
    )
    expect(fn).toHaveBeenCalledTimes(1)
  })
  it('lazy calling', () => {
    dispatch(setAge(initState.age))
    expect(fn).not.toHaveBeenCalled()
  })
  it('computed lazy calling', () => {
    dispatch({
      type: 'SET_IDENTITY',
      payload: {
        name: '0-1',
        age: '2-3'
      },
      store: 'storeA'
    })
    expect(fn).toBeCalledWith('0-1-2-3')
    fn.mockClear()
    dispatch({
      type: 'SET_IDENTITY',
      payload: {
        name: '0-1-2',
        age: 3
      },
      store: 'storeA'
    })
    expect(fn).toHaveBeenCalledTimes(0)
  })
  it("shouldn't called when unconcerned key-value changed", () => {
    dispatch(setDelay(getState('storeA#locale.delay') + 10))
    expect(fn).not.toHaveBeenCalled()
  })
  it('useful error message', () => {
    expect(() => {
      observe('$computedDescribe', fn)
    }).toThrow('selector 中必须为执行表达式')
    expect(() => {
      observe('$(true)', fn)
    }).toThrow('无法解析的 selector: $(true)')
    expect(() => {
      observe('$computedDescribe(true)rr', fn)
    }).toThrow('无法解析的 selector: $computedDescribe(true)rr')
    expect(() => {
      observe('$computedDescrib("-")', fn)
    }).toThrow('未被注册的 selector: computedDescrib')
    expect(() => {
      observe('$computedDescribe(["1", 1, \'1\'])', fn)
    }).toThrow('不能转为 JSON 的 selector 参数: ["1", 1, \'1\']')
  })
  it('unsubscibe', () => {
    unsub()
    dispatch(
      setIdentity({
        name: 'Marry',
        age: 25
      })
    )
    expect(fn).not.toHaveBeenCalled()
  })
})
