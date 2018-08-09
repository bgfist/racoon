import { HostContainer, IStores } from './host'
import { ClientContainer, IConnection } from './client'

export function createHostContainer(stores: IStores) {
  return new HostContainer(stores)
}

export function createClientContainer(conn: IConnection, host?: HostContainer) {
  return new ClientContainer(conn, host)
}

export * from './container'
export * from './host'
export * from './client'
