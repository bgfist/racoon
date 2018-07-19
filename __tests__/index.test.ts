import { storeA, storeB, initState } from './stores'
import { HostContainer } from '../src/host'

const hostContainer = new HostContainer({
	storeA,
	storeB
})

const { dispatch, getState, observe } = hostContainer

test('basic dispatch', () => {
	dispatch({
		type: 'SET_NAME',
		payload: 'B',
		store: 'storeA'
	})
	expect(getState('storeA').name).toBe('B')
	dispatch({
		type: 'SET_CITY',
		payload: 'Beijing',
		store: 'storeB'
	})
	expect(getState('storeB').locale.city).toBe('Beijing')
	dispatch({
		type: '@@SECRETE',
		payload: null,
		store: 'storeA'
	})
	expect(getState('storeA')).toBe(initState)
})

test('basic observing shallow keys', () => {
	let accumulate = 0
	const setAge = (age: number) =>
		dispatch({
			type: 'SET_AGE',
			payload: age,
			store: 'storeA'
		})
	const unsub = observe('storeA#age', age => {
		accumulate += age
	})
	expect(accumulate).toBe(0)
	// basic
	setAge(24)
	expect(accumulate).toBe(24)
	// lazy calling
	for (let i = 0; i < 100; i++) {
		setAge(20)
	}
	expect(accumulate).toBe(44)
	unsub()
	setAge(50)
	expect(accumulate).toBe(44)
})

test('basic observing deep keys', () => {
	let accumulate = 0
	const setDelay = (delay: number) =>
		dispatch({
			type: 'SET_DELAY',
			payload: delay,
			store: 'storeA'
		})
	const unsub = observe('storeA#locale.delay', delay => {
		accumulate += delay
	})
	expect(accumulate).toBe(0)
	setDelay(24)
	expect(accumulate).toBe(24)
	for (let i = 0; i < 100; i++) {
		setDelay(20)
	}
	expect(accumulate).toBe(44)
	unsub()
	setDelay(50)
	expect(accumulate).toBe(44)
})

test('when listener is called correctly', () => {
	let called = false
	const unsub = observe('storeA#name', () => {
		called = true
	})
	dispatch({
		type: 'SET_AGE',
		payload: 10,
		store: 'storeA'
	})
	expect(called).toBe(false)
	dispatch({
		type: 'SET_DELAY',
		payload: 20,
		store: 'storeA'
	})
	expect(called).toBe(false)
	dispatch({
		type: '@@SECRETE',
		payload: null,
		store: 'storeA'
	})
	expect(called).toBe(false)
	dispatch({
		type: 'SET_NAME',
		payload: 'name',
		store: 'storeB'
	})
	expect(called).toBe(false)
	dispatch({
		type: 'SET_NAME',
		payload: 'new name',
		store: 'storeA'
	})
	expect(called).toBe(true)
	unsub()
})
