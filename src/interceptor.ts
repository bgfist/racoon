import { IWatcher, IUnWatch, IInterceptor, IFilter, IContainer } from './container'

export class Interceptor implements IInterceptor {
  private container: IContainer
  private filter: IFilter
  private allUnWatch: IUnWatch[] = []
  constructor(container: IContainer, fn: IFilter) {
    this.container = container
    this.filter = fn
  }
  public watch<T>(type: T, watcher: IWatcher<T>): IUnWatch {
    const unwatch = this.container.watch(type, payload => {
      const shouldExecute = this.filter.call(null, payload)
      if (shouldExecute) {
        watcher.call(null, payload)
      }
    })
    this.allUnWatch.push(unwatch)
    return unwatch
  }
  public destroy() {
    this.allUnWatch.forEach(fn => fn())
  }
}
