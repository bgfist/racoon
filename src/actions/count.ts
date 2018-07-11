import { createAction } from '../util'

export const addOne = createAction<{ diff: number }>('addOne')

export const addTwo = createAction<{ diff2: number }>('addTwo')

export const addThree = createAction<{ three: string }>('addThree')
