import LandingPage from '../features/landing/LandingPage.jsx'
import { ErrorPage, ForbiddenPage, NotFoundPage } from '../features/system/pages.jsx'

/**
 * App route table. Shared by the browser router (App.jsx) and tests.
 * Auth (/login, /signup) and member/broker routes are added in #7 onwards.
 * @type {import('react-router').RouteObject[]}
 */
export const routes = [
  {
    path: '/',
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: '403', element: <ForbiddenPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
