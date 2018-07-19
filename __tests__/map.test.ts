import { storeA, storeB, initState } from './stores'
import { HostContainer } from '../src/host'

const hostContainer = new HostContainer({
	storeA,
	storeB
})
const { dispatch, getState, observe } = hostContainer

describe('basic single store map observer', () => {
	const values = []
	const unsub = observe(
		{
			name: 'storeA#name',
			age: 'storeA#age'
		},
		value => {
			values.unshift(value)
		}
	)
	it('modify one key', () => {
		dispatch({
			type: 'SET_NAME',
			payload: 'newName',
			store: 'storeA'
		})
		expect(values[0]).toEqual({
			name: 'newName',
			age: initState.age
		})
	})
	it('modify another key', () => {
		dispatch({
			type: 'SET_AGE',
			payload: 29,
			store: 'storeA'
		})
		expect(values[0]).toEqual({
			name: 'newName',
			age: 29
		})
	})
	it('modify both, run only once', () => {
		dispatch({
			type: 'SET_IDENTITY',
			payload: {
				name: 'Tom',
				age: 40
			},
			store: 'storeA'
		})
		expect(values[0]).toEqual({
			name: 'Tom',
			age: 40
		})
		expect(values.length).toBe(3)
	})
	it('lazy calling', () => {
		dispatch({
			type: 'SET_AGE',
			payload: 40,
			store: 'storeA'
		})
		expect(values.length).toBe(3)
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
		expect(values.length).toBe(3)
	})
})

describe('cross container observer', () => {
	const values = []
	const unsub = observe(
		{
			name: 'storeB#name',
			city: 'storeA#locale.city'
		},
		value => {
			values.unshift(value)
		}
	)
	it('modify deep key', () => {
		dispatch({
			type: 'SET_CITY',
			payload: 'Beijing',
			store: 'storeA'
		})
		expect(values[0]).toEqual({
			name: initState.name,
			city: 'Beijing'
		})
		expect(hostContainer.getState('storeB#name')).toBe(initState.name)
		expect(values.length).toBe(1)
	})
	it('unsubscribe', () => {
		unsub()
		dispatch({
			type: 'SET_NAME',
			payload: 'Kyo',
			store: 'storeB'
		})
		expect(values.length).toBe(1)
	})
})
