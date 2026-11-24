import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi } from '../../app/ApiContext.js'
import { useAuth } from '../auth/useAuth.js'

const useUserId = () => useAuth().profile?.id ?? 'anonymous'

/** People I've nominated. */
export function useNominees() {
  const api = useApi()
  const uid = useUserId()
  return useQuery({ queryKey: ['nominees', uid], queryFn: () => api.listNominees() })
}

/** Where I'm the nominee. */
export function useNominations() {
  const api = useApi()
  const uid = useUserId()
  return useQuery({ queryKey: ['nominations', uid], queryFn: () => api.listNominations() })
}

export function useInviteNominee() {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    /** @param {{ email: string, relationship: string }} values */
    mutationFn: (values) => api.inviteNominee(values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['nominees'] }),
  })
}

export function useUpdateNominee() {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    /** @param {{ id: string, action: 'accept' | 'decline' | 'revoke' | 'reinvite' }} input */
    mutationFn: ({ id, action }) => api.updateNominee(id, action),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['nominees'] }),
        queryClient.invalidateQueries({ queryKey: ['nominations'] }),
      ]),
  })
}
