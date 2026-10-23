import { clientsApi } from '../../lib/api'
import type { Client } from '../../lib/api'

export function listClients(includeInactive = false): Promise<Client[]> {
  return clientsApi.listAll(includeInactive)
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
