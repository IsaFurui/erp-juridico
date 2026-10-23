import { usersApi } from '../../../lib/api'
import type { User } from '../../../lib/api'

export function listUsers(companyId?: number): Promise<User[]> {
  return usersApi.list(companyId)
}

export function createUser(
  payload: Parameters<typeof usersApi.create>[0],
): Promise<User> {
  return usersApi.create(payload)
}

export function updateUser(
  id: number,
  payload: Parameters<typeof usersApi.update>[1],
): Promise<User> {
  return usersApi.update(id, payload)
}