import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi } from '../../app/ApiContext.js'
import { useAuth } from '../auth/useAuth.js'

// Keys include the user id so cached documents never show for another
// account on the same device (same rule as the vault queries).
const useUserId = () => useAuth().profile?.id ?? 'anonymous'

export function useDocuments() {
  const api = useApi()
  const uid = useUserId()
  return useQuery({ queryKey: ['documents', uid], queryFn: () => api.listDocuments() })
}

export function useUploadDocument() {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    /** @param {{ file: File, doc_type: string, policy_id?: string | null }} input */
    mutationFn: (input) => api.uploadDocument(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents'] }),
  })
}

export function useDeleteDocument() {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    /** @param {string} id */
    mutationFn: (id) => api.deleteDocument(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents'] }),
  })
}
