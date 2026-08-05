import { companyApi } from '../../../lib/api'
import type { Company } from '../../../lib/api'

export function listCompanies(): Promise<Company[]> {
  return companyApi.listAll()
}

export function createCompany(
  payload: Parameters<typeof companyApi.create>[0],
): Promise<Company> {
  return companyApi.create(payload)
}

export function updateCompany(
  id: number,
  payload: Parameters<typeof companyApi.update>[1],
): Promise<Company> {
  return companyApi.update(id, payload)
}

export function deactivateCompany(id: number): Promise<void> {
  return companyApi.deactivate(id)
}