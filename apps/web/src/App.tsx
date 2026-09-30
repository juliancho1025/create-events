import { ApiError, ApiProvider } from '@events/shared';
import { config } from '@events/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { TamaguiProvider } from 'tamagui';
import { Layout, RequireAdmin, RequireAuth } from './components/Layout';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { EditEventPage } from './pages/EditEventPage';
import { EventPage } from './pages/EventPage';
import { EventsPage } from './pages/EventsPage';
import { LoginPage } from './pages/LoginPage';
import { NewEventPage } from './pages/NewEventPage';
import { localTokenStorage } from './tokenStorage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Don't retry client errors (403/404...), they won't fix themselves.
      retry: (count, err) => !(err instanceof ApiError && err.status < 500) && count < 2,
    },
  },
});

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/auth/callback', element: <AuthCallbackPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <Layout />,
        children: [
          { index: true, element: <EventsPage /> },
          { path: 'events/:id', element: <EventPage /> },
          {
            element: <RequireAdmin />,
            children: [
              { path: 'events/new', element: <NewEventPage /> },
              { path: 'events/:id/edit', element: <EditEventPage /> },
            ],
          },
        ],
      },
    ],
  },
]);

function useSystemColorScheme(): 'light' | 'dark' {
  const query = '(prefers-color-scheme: dark)';
  const [dark, setDark] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent) => setDark(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return dark ? 'dark' : 'light';
}

export function App() {
  const scheme = useSystemColorScheme();
  useEffect(() => {
    document.body.style.backgroundColor = scheme === 'dark' ? '#0b0b0c' : '#f7f7f8';
  }, [scheme]);

  return (
    <TamaguiProvider config={config} defaultTheme={scheme}>
      <QueryClientProvider client={queryClient}>
        <ApiProvider baseUrl="" storage={localTokenStorage}>
          <RouterProvider router={router} />
        </ApiProvider>
      </QueryClientProvider>
    </TamaguiProvider>
  );
}
