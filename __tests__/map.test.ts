import { storeA, storeB, initState, setName, setAge } from './stores'
import { HostContainer } from '../src/host'

const hostContainer = new HostContainer({
	storeA,
	storeB
})
const { dispatch, getState, observe } = hostContainer
const fn = jest.fn()

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
		dispatch({
			type: 'SET_NAME',
			payload: 'Tom',
			store: 'storeA'
		})
		expect(fn).toBeCalledWith({
			name: 'Tom',
			age: initState.age
		})
	})
	it('modify multiple value once, run one time', () => {
		dispatch({
			type: 'SET_IDENTITY',
			payload: {
				name: 'Tom',
				age: 40
			},
			store: 'storeA'
		})
		expect(fn).toHaveBeenCalledTimes(1)
	})
	it('lazy calling', () => {
		dispatch({
			type: 'SET_AGE',
			payload: initState.age,
			store: 'storeA'
		})
		expect(fn).not.toHaveBeenCalled()
	})
	it('unsubscribe', () => {
		unsub()
		dispatch({
			type: 'SET_IDENTITY',
			payload: {
				name: 'Tony',
				age: 30
			},
			store: 'storeA'
		})
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
		dispatch({
			type: 'SET_CITY',
			payload: 'Beijing',
			store: 'storeA'
		})
		expect(fn).toHaveBeenCalledWith({
			name: initState.name,
			city: 'Beijing'
		})
	})
	it('unsubscribe', () => {
		unsub()
		dispatch({
			type: 'SET_NAME',
			payload: 'Kyo',
			store: 'storeB'
		})
		expect(fn).not.toHaveBeenCalled()
	})
})
