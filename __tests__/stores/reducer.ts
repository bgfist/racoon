import { createHandler } from './util'
import { setAge, setName, setDelay, setCity, reset, setIdentity } from './action'

export const initState = {
	name: 'ExampleName',
	age: 20,
	locale: {
		city: 'Wuhan',
		delay: 1
	}
}

const Q = createHandler(initState)
export const reducer = Q.reducer

Q(setName, (state, name) => {
	return {
		...state,
		name
	}
})

Q(setAge, (state, age) => {
	return {
		...state,
		age
	}
})

Q(setDelay, (state, delay) => {
	return {
		...state,
		locale: {
			...state.locale,
			delay
		}
	}
})

Q(setCity, (state, city) => {
	return {
		...state,
		locale: {
			...state.locale,
			city
		}
	}
})

Q(reset, () => {
	return initState
})

Q(setIdentity, (state, { name, age }) => {
	return {
		...state,
		name,
		age
	}
})
