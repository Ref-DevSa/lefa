import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi } from '../../app/ApiContext.js'
import { useAuth } from '../auth/useAuth.js'

const useUserId = () => useAuth().profile?.id ?? 'anonymous'

export function useBrokerOverview() {
  const api = useApi()
  const uid = useUserId()
  return useQuery({ queryKey: ['broker', uid, 'overview'], queryFn: () => api.getBrokerOverview() })
}

export function usePendingReports() {
  const api = useApi()
  const uid = useUserId()
  return useQuery({ queryKey: ['broker', uid, 'reports', 'pending'], queryFn: () => api.listReports('pending') })
}

/** @param {string} id */
export function useReport(id) {
  const api = useApi()
  const uid = useUserId()
  // The certificate link inside lasts 60s, so always fetch fresh.
  return useQuery({ queryKey: ['broker', uid, 'report', id], queryFn: () => api.getReport(id), staleTime: 0 })
}

export function useBrokerClaims() {
  const api = useApi()
  const uid = useUserId()
  return useQuery({ queryKey: ['broker', uid, 'claims'], queryFn: () => api.listBrokerClaims() })
}

/** @param {string} id */
export function useClaimEvents(id) {
  const api = useApi()
  const uid = useUserId()
  return useQuery({ queryKey: ['broker', uid, 'claim-events', id], queryFn: () => api.getClaimEvents(id) })
}

/** Refresh everything on the broker side after a decision or update. */
function useRefreshBroker() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: ['broker'] })
}

export function useVerifyReport() {
  const api = useApi()
  const refresh = useRefreshBroker()
  return useMutation({ mutationFn: (/** @type {string} */ id) => api.verifyReport(id), onSuccess: refresh })
}

export function useRejectReport() {
  const api = useApi()
  const refresh = useRefreshBroker()
  return useMutation({
    /** @param {{ id: string, reason: string }} input */
    mutationFn: ({ id, reason }) => api.rejectReport(id, reason),
    onSuccess: refresh,
  })
}

export function useUpdateBrokerClaim() {
  const api = useApi()
  const refresh = useRefreshBroker()
  return useMutation({
    /** @param {{ id: string, status: string, note?: string }} input */
    mutationFn: ({ id, ...values }) => api.updateClaim(id, values),
    onSuccess: refresh,
  })
}
