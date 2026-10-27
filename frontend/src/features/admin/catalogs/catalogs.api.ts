import { processStatusApi, processTypeApi } from '../../../lib/api'
import type {
  CreateProcessStatusPayload,
  ProcessStatus,
  ProcessSubtype,
  ProcessType,
  UpdateProcessStatusPayload,
} from '../../../lib/api'

// Status
export const listStatuses = (): Promise<ProcessStatus[]> =>
  processStatusApi.listAll()
export const createStatus = (
  payload: CreateProcessStatusPayload,
): Promise<ProcessStatus> => processStatusApi.create(payload)
export const updateStatus = (
  id: number,
  payload: UpdateProcessStatusPayload,
): Promise<ProcessStatus> => processStatusApi.update(id, payload)
export const removeStatus = (id: number): Promise<void> =>
  processStatusApi.remove(id)

// Tipos
export const listTypes = (): Promise<ProcessType[]> => processTypeApi.listAll()
export const createType = (name: string): Promise<ProcessType> =>
  processTypeApi.create({ name })
export const updateType = (id: number, name: string): Promise<ProcessType> =>
  processTypeApi.update(id, { name })
export const removeType = (id: number): Promise<void> =>
  processTypeApi.remove(id)

// Subtipos
export const listSubtypes = (typeId: number): Promise<ProcessSubtype[]> =>
  processTypeApi.listSubtypes(typeId)
export const createSubtype = (
  typeId: number,
  name: string,
): Promise<ProcessSubtype> => processTypeApi.createSubtype(typeId, { name })
export const updateSubtype = (
  typeId: number,
  subtypeId: number,
  name: string,
): Promise<ProcessSubtype> =>
  processTypeApi.updateSubtype(typeId, subtypeId, { name })
export const removeSubtype = (
  typeId: number,
  subtypeId: number,
): Promise<void> => processTypeApi.removeSubtype(typeId, subtypeId)
