import { createBrowserRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { routes } from './app/routes.jsx'
import { ToastProvider } from './components/ui/Toast.jsx'
import { AuthProvider } from './features/auth/AuthProvider.jsx'
import { supabase } from './lib/supabase.js'

const router = createBrowserRouter(routes)

export default function App() {
  return (
    <AuthProvider client={supabase}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </AuthProvider>
  )
}
