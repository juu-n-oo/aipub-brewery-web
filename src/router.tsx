import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import RootLayout from '@/layouts/RootLayout';

const LoginPage = lazy(() => import('@/pages/LoginPage'));
const HomePage = lazy(() => import('@/pages/HomePage'));
const DockerfileListPage = lazy(() => import('@/pages/dockerfile/DockerfileListPage'));
const DockerfileEditorPage = lazy(() => import('@/pages/dockerfile/DockerfileEditorPage'));
const BuildListPage = lazy(() => import('@/pages/build/BuildListPage'));
const BuildDetailPage = lazy(() => import('@/pages/build/BuildDetailPage'));

function Lazy({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-zinc-500">Loading...</p>
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Lazy><LoginPage /></Lazy>,
  },
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Lazy><HomePage /></Lazy> },
      { path: 'dockerfiles', element: <Lazy><DockerfileListPage /></Lazy> },
      { path: 'dockerfiles/new', element: <Lazy><DockerfileEditorPage /></Lazy> },
      { path: 'dockerfiles/:id/edit', element: <Lazy><DockerfileEditorPage /></Lazy> },
      { path: 'builds', element: <Lazy><BuildListPage /></Lazy> },
      { path: 'builds/:namespace/:name', element: <Lazy><BuildDetailPage /></Lazy> },
    ],
  },
]);
