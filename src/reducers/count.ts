import { addOne, addThree, addTwo } from '../actions'
import { createHandler } from '../util'

const intialCount = {
	numOne: 0,
	label: ''
}

const H = createHandler(intialCount)
export default H.reducer

H(addOne, (count, { diff }) => {
	count.numOne += diff

	return { ...count }
})

H(addTwo, (count, { diff2 }) => {
	count.label += diff2

	return { ...count }
})

H(addThree, (count, { three }) => {
	return count
})
