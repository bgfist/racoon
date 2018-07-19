import { storeA, storeB, initState } from './stores'
import { HostContainer } from '../src/host'

const hostContainer = new HostContainer({
	storeA,
	storeB
})

const { dispatch, getState, observe } = hostContainer

test.skip('basic selector', () => {
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
	dispatch({
		type: 'SET_AGE',
		payload: 20,
		store: 'storeA'
	})
	expect(desc[0]).toBe(`${initState.name}-20`)
	dispatch({
		type: 'SET_NAME',
		payload: 'newName',
		store: 'storeA'
	})
	expect(desc[0]).toBe('newName-20')
	dispatch({
		type: 'SET_DELAY',
		payload: null,
		store: 'storeA'
	})
	expect(desc[0]).toBe('newName-20')
})
