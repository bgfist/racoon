type AnyFuc = (...args: any[]) => any
type Handler<Params, State> = (state: State, payload: Params) => State | AnyFuc
type Action<Params> = (payload: Params) => any
interface IAction {
	type: string
	payload: any
}

interface IHandlerManager<State> {
	reducer: (state: State | undefined, action: IAction) => State
	<Params>(action: Action<Params>, handler: Handler<Params, State>): void
}

export function createAction<T>(type: string) {
	const creator = (payload: T): any => ({ dispatch }: { dispatch: any }) =>
		dispatch({
			type,
			payload
		})
	creator.toString = () => type
	return creator
}

export function createHandler<State>(initialState: State) {
	const handlers: { [type: string]: AnyFuc } = {}

	const handlerManager: IHandlerManager<State> = (<Params>(action: Action<Params>, handler: Handler<Params, State>) => {
		handlers[action.toString()] = handler
	}) as IHandlerManager<State>

	handlerManager.reducer = (state: State = initialState, { type, payload }) => {
		const handler = handlers[type]
		if (handler) {
			return handler(state, payload)
		}
		return state
	}
	return handlerManager
}
