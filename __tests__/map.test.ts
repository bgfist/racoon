import { storeA, storeB, initState } from './stores'
import { HostContainer } from '../src/host'

const hostContainer = new HostContainer({
	storeA,
	storeB
})

const { dispatch, getState, observe } = hostContainer

test.only('basic single store map observer', () => {
	const values = []
	const unsub = hostContainer.observe(
		{
			name: 'storeA#name',
			age: 'storeA#age'
		},
		value => {
			values.unshift(value)
		}
	)
	dispatch({
		type: 'SET_NAME',
		payload: 'newName',
		store: 'storeA'
	})
	expect(values[0]).toEqual({
		name: 'newName',
		age: initState.age
	})
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
