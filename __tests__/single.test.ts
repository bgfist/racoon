import { createNewStore, initState } from './stores'
import { HostContainer } from '../src/host'
import { setName, setCity, reset, setAge, StoreType, createTester } from './stores/createHostTester'

const container = new HostContainer(createNewStore())
const { dispatch, observe, getState } = container

describe('basic observing keys', () => {
  it('get state', () => {
    expect(getState()).toBe(initState)
  })
  it('dispatch directly', () => {
    dispatch(setAge(10))
    expect(getState().age).toBe(10)
  })
  describe('observe single store', () => {
    const fn = jest.fn()
    beforeEach(() => {
      dispatch(reset())
      fn.mockClear()
    })
    it('basic observing & unobserving', () => {
      const unob = observe('age', fn)
      fn.mockClear()
      dispatch(setAge(10))
      expect(fn).toBeCalledWith(10)
      fn.mockClear()
      unob()
      dispatch(setAge(20))
      expect(fn).toHaveBeenCalledTimes(0)
    })
    it('observe multiple', () => {
      observe(
        {
          a: 'name',
          b: 'age'
        },
        fn
      )()
      expect(fn).toHaveBeenCalledWith({
        a: initState.name,
        b: initState.age
      })
    })
    it('immediate calling', () => {
      observe('age', fn)
      expect(fn).toBeCalledWith(initState.age)
    })
  })
  describe('selector', () => {
    container.defineSelectors({
      identity: getStoreState => (connector: string) => {
        const { name, age } = getStoreState()
        return name + connector + age
      }
    })
    const fn = jest.fn()
    beforeEach(() => {
      container.dispatch(reset())
      fn.mockClear()
    })
    it('observing & unobserving', () => {
      const unob = observe('$identity("--")', fn)
      fn.mockClear()
      dispatch(setAge(10))
      expect(fn).toHaveBeenCalledWith(`${initState.name}--10`)
      fn.mockClear()
      unob()
      dispatch(setName('Trump'))
      expect(fn).toHaveBeenCalledTimes(0)
    })
    it('immediately calling', () => {
      observe('$identity("--")', fn)()
      expect(fn).toHaveBeenCalledWith(`${initState.name}--${initState.age}`)
    })
  })
})
