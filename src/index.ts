import { applyMiddleware, createStore, Reducer } from 'redux'
import thunkMiddleWare from './middlewares/thunk'
import reducer from './reducers'

export * from './actions'
export type State = typeof reducer extends Reducer<infer T> ? T : any

export default createStore(reducer, applyMiddleware(thunkMiddleWare))
