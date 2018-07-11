### redux数据中心


> 将数据分发逻辑(reducer)集中于此仓库处理，暴露store、action和state的结构出去。

> 主语言是ts，可以针对其他语言将要暴露的接口自动化生成代码 (react-native link?)

- store是个只有几个简单方法的对象(getState、dispatch、subscribe)
- action、state都是纯对象