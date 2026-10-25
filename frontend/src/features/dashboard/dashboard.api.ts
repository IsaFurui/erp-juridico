import { dashboardApi } from '../../lib/api'
import type { DashboardData } from '../../lib/api'

export function getDashboard(): Promise<DashboardData> {
  return dashboardApi.get()
}
