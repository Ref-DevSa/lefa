import LandingPage from '../features/landing/LandingPage.jsx'
import LoginPage from '../features/auth/LoginPage.jsx'
import SignupPage from '../features/auth/SignupPage.jsx'
import VaultPage from '../features/vault/VaultPage.jsx'
import PolicyDetailPage from '../features/vault/PolicyDetailPage.jsx'
import BrokerDashboard from '../features/broker/BrokerDashboard.jsx'
import { RequireAuth, RequireRole } from '../features/auth/guards.jsx'
import { ErrorPage, ForbiddenPage, NotFoundPage } from '../features/system/pages.jsx'

/**
 * App route table. Shared by the browser router (App.jsx) and tests.
 *
 *   public:        /, /login, /signup, /403, 404
 *   member:        /vault, /vault/policies/:id
 *   broker/admin:  /broker
 * @type {import('react-router').RouteObject[]}
 */
export const routes = [
  {
    path: '/',
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'signup', element: <SignupPage /> },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <RequireRole roles={['member']} />,
            children: [
              { path: 'vault', element: <VaultPage /> },
              { path: 'vault/policies/:id', element: <PolicyDetailPage /> },
            ],
          },
          {
            element: <RequireRole roles={['broker', 'admin']} />,
            children: [{ path: 'broker', element: <BrokerDashboard /> }],
          },
        ],
      },
      { path: '403', element: <ForbiddenPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
