import { type ReactNode } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { setTokenGetter } from './token';
import Landing from '../pages/Landing';

// Gates the whole app behind Auth0. Unauthenticated users see the landing page
// (with a Log in button); authenticated users see the app. Also wires the
// access-token getter into the API client (render phase, before child fetches).
export default function RequireAuth({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated, error, loginWithRedirect, getAccessTokenSilently } = useAuth0();

  setTokenGetter(() => getAccessTokenSilently());

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 text-center">
        <div>
          <p className="text-base font-semibold">Sign-in error</p>
          <p className="text-sm text-slate-400 mt-1 max-w-xs">{error.message}</p>
          <button onClick={() => loginWithRedirect()}
            className="mt-4 px-5 py-2.5 bg-indigo-600 text-white rounded-2xl text-sm font-semibold">
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-white/20 border-t-indigo-400 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return <Landing />;

  return <>{children}</>;
}
