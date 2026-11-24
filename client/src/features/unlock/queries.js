import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi } from '../../app/ApiContext.js'
import { useAuth } from '../auth/useAuth.js'

const useUserId = () => useAuth().profile?.id ?? 'anonymous'

/** A deceased member's unlocked vault (403 vault_locked until verified). @param {string} ownerId */
export function useVault(ownerId) {
  const api = useApi()
  const uid = useUserId()
  return useQuery({ queryKey: ['vault', uid, ownerId], queryFn: () => api.getVault(ownerId) })
}

export function useReportDeath() {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    /** @param {{ ownerId: string, dateOfDeath: string, dhaReference?: string, notes?: string, certificate: File }} input */
    mutationFn: (input) => api.reportDeath(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['nominations'] }),
  })
}

export function useUpdateClaim() {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    /** @param {{ id: string, status: string, note?: string }} input */
    mutationFn: ({ id, ...values }) => api.updateClaim(id, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vault'] }),
  })
}
