import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient } from '@tanstack/react-query'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { routes } from '../app/routes.jsx'
import { AppProviders } from '../app/AppProviders.jsx'
import { createFakeSupabase } from './fakeSupabase.js'
import { createFakeApi } from './fakeApi.js'

export const thandi = {
  email: 'thandi@lefa.test',
  password: 'Vault2026!',
  full_name: 'Thandi Mokoena',
  phone: '+27820000001',
  role: /** @type {const} */ ('member'),
}

/**
 * Render the whole app at `path`, with fakes for Supabase (login) and the
 * Lefa API, exactly as App.jsx wires the real ones.
 * @param {string} path
 * @param {{
 *   supabase?: Parameters<typeof createFakeSupabase>[0],
 *   api?: ReturnType<typeof createFakeApi>,
 * }} [options]
 */
export function renderApp(path, { supabase = { users: [thandi], signedInAs: thandi.email }, api = createFakeApi() } = {}) {
  const client = createFakeSupabase(supabase)
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <AppProviders supabase={client} queryClient={queryClient} api={api}>
      <RouterProvider router={router} />
    </AppProviders>,
  )
  return { client, api, router, queryClient, user: userEvent.setup() }
}
