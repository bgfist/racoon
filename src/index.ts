import { HostContainer, IStores } from './host'
import { ClientContainer, IConnection } from './client'

export function createHostContainer(stores: IStores | IStores[string], defaultKey?: string) {
  return new HostContainer(stores, defaultKey)
}

export function createClientContainer(conn: IConnection, host?: HostContainer) {
  return new ClientContainer(conn, host)
}

export * from './container'
export * from './host'
export * from './client'
