import { storeA, storeB, initState, setAge } from './stores'
import { HostContainer } from '../src/host'
import { ClientContainer, IConnection, Messager } from '../src/client'
import EventEmitter from 'events'

const hostContainer = new HostContainer({
	storeA,
	storeB
})

const emitter1 = new EventEmitter()
const emitter2 = new EventEmitter()
const bridge1: IConnection = {
	postMessage(message: string) {
		emitter2.emit('message', message)
	},
	handleMessage(onmessage: Messager) {
		emitter1.addListener('messsage', onmessage)
	}
}
const bridge2: IConnection = {
	postMessage(message: string) {
		emitter1.emit('message', message)
	},
	handleMessage(onmessage: Messager) {
		emitter2.addListener('messsage', onmessage)
	}
}

const clientContainer1 = new ClientContainer(bridge1, hostContainer)
const clientContainer2 = new ClientContainer(bridge2)

describe('client has no host', () => {
	it('fetchState', () => {
		expect(clientContainer2.fetchState('storeA#age')).resolves.toBe(initState.age)
	})

	it('observe', done => {
		clientContainer2.observe('storeA#age', age => {
			expect(age).toBe(20)
			done()
		})
		clientContainer2.dispatch({
			store: 'storeA',
			...setAge(20)
		})
	})
})
