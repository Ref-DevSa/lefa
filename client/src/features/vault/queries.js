import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi } from '../../app/ApiContext.js'
import { useAuth } from '../auth/useAuth.js'

// Server data for the vault, via TanStack Query: it caches results, shows
// loading/error states, and refreshes the list and totals after a change.
// Every key includes the user's id, so if someone logs out and another
// person logs in on the same browser, they never see the previous user's
// cached vault.

function useUserId() {
  return useAuth().profile?.id ?? 'anonymous'
}

export function usePolicies() {
  const api = useApi()
  const uid = useUserId()
  return useQuery({ queryKey: ['policies', uid], queryFn: () => api.listPolicies() })
}

export function useVaultSummary() {
  const api = useApi()
  const uid = useUserId()
  return useQuery({ queryKey: ['vault-summary', uid], queryFn: () => api.getSummary() })
}

/** @param {string} id */
export function usePolicy(id) {
  const api = useApi()
  const uid = useUserId()
  return useQuery({ queryKey: ['policy', uid, id], queryFn: () => api.getPolicy(id) })
}

function useRefreshVault() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all(['policies', 'vault-summary', 'policy'].map((key) => queryClient.invalidateQueries({ queryKey: [key] })))
}

/** Create (no id) or update (with id) a policy. */
export function useSavePolicy() {
  const api = useApi()
  const refresh = useRefreshVault()
  return useMutation({
    /** @param {{ id?: string, values: Record<string, any> }} input */
    mutationFn: ({ id, values }) => (id ? api.updatePolicy(id, values) : api.createPolicy(values)),
    onSuccess: refresh,
  })
}

export function useDeletePolicy() {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    /** @param {string} id */
    mutationFn: (id) => api.deletePolicy(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: ['policy'], predicate: (q) => q.queryKey[2] === id })
      return Promise.all(['policies', 'vault-summary'].map((key) => queryClient.invalidateQueries({ queryKey: [key] })))
    },
  })
}
