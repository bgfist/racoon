import { createSelector } from 'reselect'
import { State } from '..'

export const selectNumOne = (state: State) => state.count.numOne

export const selectTotal = createSelector([selectNumOne], numOne => numOne * 2)
