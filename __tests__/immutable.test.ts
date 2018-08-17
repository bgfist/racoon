// tslint:disable-next-line
import { fromJS } from 'immutable'
import { createStore } from 'redux'
import { HostContainer } from '../src/index'

describe('immutable.js', () => {
  const initState = {
    a: 1,
    b: {
      c: 2
    }
  }
  const immutableState = fromJS(initState)
  const reducer = (state = immutableState, action) => {
    switch (action.type) {
      case 'a':
        return state.set('a', action.payload)
      case 'c':
        return state.setIn(['b', 'c'], action.payload)
      default:
        return state
    }
  }
  const store = createStore(reducer, immutableState)
  const hostContainer = new HostContainer(store)
  const { getState, observe, dispatch } = hostContainer
  it('get value', () => {
    expect(getState('b.c')).toBe(initState.b.c)
    expect(getState('a')).toBe(initState.a)
  })
  it('observe', () => {
    const fn = jest.fn()
    observe('a', fn)()
    expect(fn).toHaveBeenCalledWith(initState.a)
    fn.mockClear()
    const unob = observe('b.c', fn)
    fn.mockClear()
    dispatch({
      type: 'c',
      payload: 1
    })
    expect(fn).toHaveBeenCalledWith(1)
    unob()
    fn.mockClear()
    dispatch({
      type: 'c',
      payload: 4
    })
    expect(fn).not.toHaveBeenCalled()
  })
})
