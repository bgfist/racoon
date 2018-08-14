### redux 数据中心

#### HostContainer

 监听 redux 数据变化， 并 diff 出变化的路径， 通知订阅者某个键的值变了

#### ClientContainer

端到端的消息解释器，解析消息并执行`HostContainer`的相应动作

>  注意，一定要在页面 unload 时调用`clientContainer.destroy()`来取消所有订阅

>  虽然目前 clientContainer 内部会防止重复监听

>  支持dispatch简单的thunk

