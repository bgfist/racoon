import { storeA, storeB, initState } from './stores'
import { HostContainer } from '../src/host'

const hostContainer = new HostContainer({
	storeA,
	storeB
})

const { dispatch, getState, observe } = hostContainer
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
		fn.mockClear()
	})
	it('called immediately', () => {
		observe('$computedDescribe("-")', fn)()
		expect(fn).toHaveBeenCalledTimes(1)
	})
	it('called when on key changed', () => {
		dispatch({
			type: 'SET_AGE',
			payload: 23,
			store: 'storeA'
		})
		expect(fn).toHaveBeenCalledWith(`${initState.name}-23`)
		dispatch({
			type: 'SET_NAME',
			payload: 'newName',
			store: 'storeA'
		})
		expect(fn).toHaveBeenCalledWith('newName-23')
	})
	it('only called once when multiple observing-values changed', () => {
		dispatch({
			type: 'SET_IDENTITY',
			payload: {
				name: 'Henrry',
				age: 40
			},
			store: 'storeA'
		})
		expect(fn).toHaveBeenCalledTimes(1)
	})
	it('lazy calling', () => {
		dispatch({
			type: 'SET_AGE',
			payload: getState('storeA#age'),
			store: 'storeA'
		})
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
		dispatch({
			type: 'SET_IDENTITY',
			payload: {
				name: '0-1-2',
				age: 3
			},
			store: 'storeA'
		})
		expect(fn).toHaveBeenCalledTimes(1)
	})
	it("shouldn't called when unconcerned key-value changed", () => {
		dispatch({
			type: 'SET_DELAY',
			payload: null,
			store: 'storeA'
		})
		expect(fn).not.toHaveBeenCalled()
	})
	it('unsubscibe', () => {
		unsub()
		dispatch({
			type: 'SET_IDENTITY',
			payload: {
				name: 'Marry',
				age: 25
			},
			store: 'storeA'
		})
		expect(fn).not.toHaveBeenCalled()
	})
})
