### redux 数据中心


### 架构

> hostContainer为全局唯一的单例，所有服务最终都是依赖于它，可以将其看成一个服务器

> clientContainer只是一个通信的壳，clientContainer必须配对存在

> clientContainer上的所有接口最终都是去hostContainer上注册服务，然后将服务的结果返回给调用者

> 统一接口以让hostContainer和clientContainer能无区别使用


## example

host.ts
```ts
import { createHostContainer, createClientContainer } from '@shimo/racoon';

const store = ...; // some redux store
const container = createHostContainer(store);
const connection = {
  postMessage: ...,
  handleMessage: ...
}; // a bridge to send/receive message
createClientContainer(connection, container); // the returned clientContainer is useless

container.dispatch({
  type: 'some command',
  payload: 'some payload'
}, res => {
  console.log(res); // "a ha, I got it"
})

// store can dispatch too !
store.dispatch({
  type: 'some command',
  payload: 'some payload'
}, res => {
  console.log(res); // "a ha, I got it"
})

container.watch(type: 'another command', (payload, cb) => {
  cb("nice"); // send back
})

```

client.ts
```ts
import { createClientContainer } from '@shimo/racoon';

const connection = {
  postMessage: ...,
  handleMessage: ...
} // a bridge to send/receive message

const container = createClientContainer(connection)

container.watch('some command', (payload, cb) => {
  // do something with the payload
  cb("a ha, I got it"); // send back, invoke it only once
  cb("oooooo");  // not work
})

container.dispatch({
  type: 'another command',
  payload: 'another payload'
}, res => {
  console.log(res); // "nice"
})
```

#### HostContainer

监听store的变化，拦截store发出的action

#### ClientContainer

端到端的消息解释器，解析消息并执行`HostContainer`的相应动作

>  注意，一定要在页面 unload 时调用`clientContainer.destroy()`来取消所有订阅, 虽然目前 clientContainer 内部会防止重复监听

消息协议的处理

* 消息id, 可以方便回包时调用对应的回调函数
* 消息type, 可以区分请求的是哪种服务, 传了哪些信息
* callbacks, 存放所有回调函数


#### Interceptor

增强版的watch，作用有两个:
* 能批量unwatch，因为watch都会在hostContainer那边注册监听函数，会有资源占用，不用时必须unwatch
* 能对消息内容进行过滤


#### diff算法

针对数组和对象做两套处理，递归diff。diff出的结果怎么存？ —— 数组

```ts
const lhs = ... ;
const rhs = ... ;

lhs === applyPatch(rhs, diff(lhs, rhs))
```