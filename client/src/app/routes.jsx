import LandingPage from '../features/landing/LandingPage.jsx'
import LoginPage from '../features/auth/LoginPage.jsx'
import SignupPage from '../features/auth/SignupPage.jsx'
import VaultPage from '../features/vault/VaultPage.jsx'
import PolicyDetailPage from '../features/vault/PolicyDetailPage.jsx'
import DocumentsPage from '../features/documents/DocumentsPage.jsx'
import NomineesPage from '../features/nominees/NomineesPage.jsx'
import NominatedPage from '../features/nominees/NominatedPage.jsx'
import ReportDeathPage from '../features/unlock/ReportDeathPage.jsx'
import UnlockedVaultPage from '../features/unlock/UnlockedVaultPage.jsx'
import BrokerDashboard from '../features/broker/BrokerDashboard.jsx'
import { RequireAuth, RequireRole } from '../features/auth/guards.jsx'
import { ErrorPage, ForbiddenPage, NotFoundPage } from '../features/system/pages.jsx'

/**
 * App route table. Shared by the browser router (App.jsx) and tests.
 *
 *   public:        /, /login, /signup, /403, 404
 *   member:        /vault, /vault/policies/:id, /documents, /nominees, /nominated,
 *                  /nominated/:ownerId/report, /vaults/:ownerId
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
              { path: 'documents', element: <DocumentsPage /> },
              { path: 'nominees', element: <NomineesPage /> },
              { path: 'nominated', element: <NominatedPage /> },
              { path: 'nominated/:ownerId/report', element: <ReportDeathPage /> },
              { path: 'vaults/:ownerId', element: <UnlockedVaultPage /> },
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
