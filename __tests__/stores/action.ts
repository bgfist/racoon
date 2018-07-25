import { createAction } from './util'

export const setName = createAction<string>('SET_NAME')

export const setAge = createAction<number>('SET_AGE')

export const setDelay = createAction<number>('SET_DELAY')

export const setCity = createAction<string>('SET_CITY')

export const setIdentity = createAction<{ name: string; age: number }>('SET_IDENTITY')

export const badAction = createAction<string>('BAD_ACTION')

export const reset = createAction('RESET')
