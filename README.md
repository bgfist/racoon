### redux 数据中心

### Concepts

#### HostContainer

 监听 redux 数据变化， 并 diff 出变化的路径， 通知订阅者某个键的值变了

#### ClientContainer

端到端的消息解释器，解析消息并执行`HostContainer`的相应动作
