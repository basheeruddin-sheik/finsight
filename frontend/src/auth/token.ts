// Bridges the Auth0 access token (only available via the useAuth0 hook) to the
// plain axios client. RequireAuth registers the getter; the request interceptor
// reads it on every call.
type Getter = () => Promise<string>;

let getter: Getter | null = null;

export const setTokenGetter = (g: Getter | null) => { getter = g; };

export const getAccessToken = async (): Promise<string | null> => {
  if (!getter) return null;
  try { return await getter(); }
  catch { return null; }
};
