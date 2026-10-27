import {
  processesApi,
  processStatusApi,
  processTypeApi,
  usersApi,
} from '../../lib/api'
import type {
  ChangeProcessStatusPayload,
  Colleague,
  CreateProcessPayload,
  ListProcessesParams,
  Paginated,
  ProcessDetail,
  ProcessListItem,
  ProcessStatus,
  ProcessSubtype,
  ProcessType,
  UpdateProcessPayload,
} from '../../lib/api'

export function listColleagues(): Promise<Colleague[]> {
  return usersApi.colleagues()
}

export function listProcesses(
  params: ListProcessesParams = {},
): Promise<Paginated<ProcessListItem>> {
  return processesApi.listAll(params)
}

export function getProcess(id: number): Promise<ProcessDetail> {
  return processesApi.getById(id)
}

export function createProcess(
  payload: CreateProcessPayload,
): Promise<ProcessListItem> {
  return processesApi.create(payload)
}

export function updateProcess(
  id: number,
  payload: UpdateProcessPayload,
): Promise<ProcessListItem> {
  return processesApi.update(id, payload)
}

export function changeProcessStatus(
  id: number,
  payload: ChangeProcessStatusPayload,
): Promise<ProcessDetail> {
  return processesApi.changeStatus(id, payload)
}

export function listProcessStatuses(): Promise<ProcessStatus[]> {
  return processStatusApi.listAll()
}

export function listProcessTypes(): Promise<ProcessType[]> {
  return processTypeApi.listAll()
}

export function listSubtypes(typeId: number): Promise<ProcessSubtype[]> {
  return processTypeApi.listSubtypes(typeId)
}
