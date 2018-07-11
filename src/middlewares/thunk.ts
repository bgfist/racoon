export default (store: any) => (next: any) => (action: any) => {
	if (typeof action === 'function') {
		return action(store)
	}
	return next(action)
}
