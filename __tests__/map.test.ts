import { storeA, storeB, initState } from './stores'
import { HostContainer } from '../src/host'
import { setName, setCity, reset, setAge, StoreType, createTester, setIdentity } from './stores/createHostTester'

const hostContainer = new HostContainer({
  storeA,
  storeB
})
const { dispatch, getState, observe } = createTester(hostContainer)
const fn = jest.fn()

beforeEach(() => {
  dispatch(reset())
  dispatch(reset(), StoreType.B)
})

describe('basic single store map observer', () => {
  beforeEach(() => {
    fn.mockClear()
  })
  const unsub = observe(
    {
      name: 'storeA#name',
      age: 'storeA#age'
    },
    fn
  )
  it('called immediately', () => {
    observe(
      {
        name: 'storeA#name',
        age: 'storeA#age'
      },
      fn
    )()
    expect(fn).toHaveBeenCalled()
  })
  it('modify one key', () => {
    dispatch(setName('Tom'))
    expect(fn).toBeCalledWith({
      name: 'Tom',
      age: initState.age
    })
  })
  it('modify multiple value once, run one time', () => {
    dispatch(
      setIdentity({
        name: 'Tom',
        age: 40
      })
    )
    expect(fn).toHaveBeenCalledTimes(1)
  })
  it('lazy calling', () => {
    dispatch(setAge(initState.age))
    expect(fn).not.toHaveBeenCalled()
  })
  it('unsubscribe', () => {
    unsub()
    dispatch(
      setIdentity({
        name: 'Tony',
        age: 30
      })
    )
    expect(fn).not.toHaveBeenCalled()
  })
})

describe('cross container observer', () => {
  beforeEach(() => {
    fn.mockClear()
  })
  const unsub = observe(
    {
      name: 'storeB#name',
      city: 'storeA#locale.city'
    },
    fn
  )
  it('modify deep key', () => {
    dispatch(setCity('Beijing'))
    expect(fn).toHaveBeenCalledWith({
      name: initState.name,
      city: 'Beijing'
    })
  })
  it('unsubscribe', () => {
    unsub()
    dispatch(setName('Kyo'), StoreType.B)
    expect(fn).not.toHaveBeenCalled()
  })
})
