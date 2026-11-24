import { QueryClient } from '@tanstack/react-query'
import { createBrowserRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { routes } from './app/routes.jsx'
import { AppProviders } from './app/AppProviders.jsx'
import { supabase } from './lib/supabase.js'

const router = createBrowserRouter(routes)

// Cached server data stays fresh for 30s; switching back to the tab refetches.
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

export default function App() {
  return (
    <AppProviders supabase={supabase} queryClient={queryClient}>
      <RouterProvider router={router} />
    </AppProviders>
  )
}
