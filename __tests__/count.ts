import store from '../src'
import { addOne } from '../src/actions/count'

describe('count', () => {
	it('initial', () => {
		expect(store.getState().count).toEqual({ numOne: 0, label: '' })
	})

	it('addOne', () => {
		store.dispatch(addOne({ diff: 2 }))
		expect(store.getState().count).toEqual({ numOne: 2, label: '' })
	})
})
