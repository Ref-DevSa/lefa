import { createBrowserRouter, RouterProvider } from 'react-router'
import { routes } from './app/routes.jsx'
import { ToastProvider } from './components/ui/Toast.jsx'

const router = createBrowserRouter(routes)

export default function App() {
  return (
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>
  )
}
