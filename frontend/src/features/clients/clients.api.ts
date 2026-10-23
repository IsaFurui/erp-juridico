import { clientsApi } from '../../lib/api'
import type { Client, ListClientsParams, Paginated } from '../../lib/api'

export function listClients(
  params: ListClientsParams = {},
): Promise<Paginated<Client>> {
  return clientsApi.listAll(params)
}

export function createClient(
  payload: Parameters<typeof clientsApi.create>[0],
): Promise<Client> {
  return clientsApi.create(payload)
}

export function updateClient(
  id: number,
  payload: Parameters<typeof clientsApi.update>[1],
): Promise<Client> {
  return clientsApi.update(id, payload)
}

export function deactivateClient(id: number): Promise<void> {
  return clientsApi.deactivate(id)
}

export function activateClient(id: number): Promise<Client> {
  return clientsApi.activate(id)
}
