import { createNewStore, initState } from './stores'
import { HostContainer } from '../src/host'

const container = new HostContainer({
	storeA: createNewStore(),
	storeB: createNewStore()
})
const { dispatch, getState, observe } = container

describe('basic dispatch', () => {
	it('get redux store state', () => {
		expect(container.getState('storeA#locale.city')).toBe(initState.locale.city)
		expect(container.getState('storeB#name')).toBe(initState.name)
	})
	it('dispatch correctly', () => {
		dispatch({
			type: 'SET_NAME',
			payload: 'Tom',
			store: 'storeA'
		})
		expect(getState('storeA#name')).toBe('Tom')
		dispatch({
			type: 'SET_CITY',
			payload: 'Beijing',
			store: 'storeB'
		})
		expect(getState('storeB#locale.city')).toBe('Beijing')
	})
})

describe('basic observing keys', () => {
	beforeEach(() => {
		dispatch({
			type: 'RESET',
			payload: null,
			store: 'storeA'
		})
		dispatch({
			type: 'RESET',
			payload: null,
			store: 'storeB'
		})
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
		dispatch({
			type: 'SET_CITY',
			payload: 'Beijing',
			store: 'storeA'
		})
		expect(fn).toBeCalledWith('Beijing')
		cancel()
	})
	it('called when observed value changed', () => {
		dispatch({
			type: 'SET_AGE',
			payload: 30,
			store: 'storeA'
		})
		expect(fn).toHaveBeenCalledWith(30)
	})
	it('lazy calling', () => {
		for (let i = 0; i < 10; i++) {
			dispatch({
				type: 'SET_AGE',
				payload: 30,
				store: 'storeA'
			})
		}
		expect(fn).toHaveBeenCalledTimes(1)
	})
	it('unsuscribe', () => {
		unsub()
		expect(fn).not.toBeCalled()
	})
	it('when called correctly', () => {
		dispatch({
			type: 'SET_NAME',
			payload: 'Tony',
			store: 'storeA'
		})
		expect(fn).not.toBeCalled()
		dispatch({
			type: 'SET_AGE',
			payload: 10,
			store: 'storeB'
		})
		expect(fn).not.toBeCalled()
	})
})
