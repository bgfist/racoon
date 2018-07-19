import { Reducer } from 'redux'

export interface IState {
	name: string
	age: number
	locale: {
		city: string
		delay: 1
	}
}

export interface IAction {
	type: string
	payload: any
}

export const initState: IState = {
	name: 'ExampleName',
	age: 20,
	locale: {
		city: 'Wuhan',
		delay: 1
	}
}

export const reducer: Reducer<IState, IAction> = (state: IState = initState, action: IAction): IState => {
	switch (action.type) {
		case 'SET_NAME':
			return {
				...state,
				name: action.payload
			}
		case 'SET_AGE':
			return {
				...state,
				age: action.payload
			}
		case 'SET_DELAY':
			return {
				...state,
				locale: {
					...state.locale,
					delay: action.payload
				}
			}
		case 'SET_CITY':
			return {
				...state,
				locale: {
					...state.locale,
					city: action.payload
				}
			}
		case 'SET_IDENTITY':
			return {
				...state,
				age: action.payload.age,
				name: action.payload.name
			}
		case 'RESET':
			return initState
		default:
			return state
	}
}
