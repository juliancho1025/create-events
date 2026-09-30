import { useApiContext } from '@events/shared';
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { PageState } from '../components/PageState';

/** Landing page after Google OAuth: the API redirects here with `#token=<jwt>`. */
export function AuthCallbackPage() {
  const { signIn } = useApiContext();
  const navigate = useNavigate();
  const token = new URLSearchParams(window.location.hash.slice(1)).get('token');
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current || !token) return;
    handled.current = true; // StrictMode runs effects twice in dev
    void signIn(token).then(() => navigate('/', { replace: true }));
  }, [token, signIn, navigate]);

  return token ? <PageState loading /> : <PageState error={new Error('Login failed: no token received')} />;
}
