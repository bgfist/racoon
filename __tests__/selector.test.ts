import { storeA, storeB, initState } from './stores'
import { HostContainer } from '../src/host'

const hostContainer = new HostContainer({
	storeA,
	storeB
})

const { dispatch, getState, observe } = hostContainer

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
	const desc: string[] = []
	const unsub = observe('$computedDescribe("-")', currentDescribe => {
		desc.unshift(currentDescribe)
	})
	it('called when on key changed', () => {
		dispatch({
			type: 'SET_AGE',
			payload: 23,
			store: 'storeA'
		})
		expect(desc[0]).toBe(`${initState.name}-23`)
		dispatch({
			type: 'SET_NAME',
			payload: 'newName',
			store: 'storeA'
		})
		expect(desc[0]).toBe('newName-23')
		dispatch({
			type: 'SET_IDENTITY',
			payload: {
				name: 'Henrry',
				age: 40
			},
			store: 'storeA'
		})
		expect(desc[0]).toBe('Henrry-40')
		expect(desc.length).toBe(3)
	})
	it('lazy calling', () => {
		dispatch({
			type: 'SET_AGE',
			payload: 40,
			store: 'storeA'
		})
		expect(desc.length).toBe(3)
	})
	it("shouldn't called when unconcerned key-value changed", () => {
		dispatch({
			type: 'SET_DELAY',
			payload: null,
			store: 'storeA'
		})
		expect(desc[0]).toBe('Henrry-40')
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
		expect(desc[0]).toBe('Henrry-40')
		expect(desc.length).toBe(3)
	})
})
