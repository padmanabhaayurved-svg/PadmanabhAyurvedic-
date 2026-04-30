/* ============================================================
   PADMANABH AYURVEDICS — SHARED AUTH0 LOGIC
   Handles authentication for both Admins and Users.
   ============================================================ */

const AUTH0_CONFIG = {
  domain:   'dev-7c0nglnmb4cv228b.us.auth0.com',
  clientId: 'B4XFDFFGu1emngk9Yv4upDM51HZddskq', // "My App" SPA
  audience: 'https://dev-7c0nglnmb4cv228b.us.auth0.com/api/v2/'
};

let _auth0Client = null;

/** Initialize Auth0 Client */
async function initAuth0() {
  if (_auth0Client) return _auth0Client;
  
  if (typeof auth0 === 'undefined') {
    console.error('[Auth0] SDK not found in window');
    return null;
  }

  try {
    _auth0Client = await auth0.createAuth0Client({
      domain:   AUTH0_CONFIG.domain,
      clientId: AUTH0_CONFIG.clientId,
      authorizationParams: {
        audience: AUTH0_CONFIG.audience,
        redirect_uri: window.location.origin + window.location.pathname
      }
    });
    console.log('[Auth0] Initialized successfully');
    return _auth0Client;
  } catch (err) {
    console.error('[Auth0] Init failed:', err);
    return null;
  }
}

/** Login with Auth0 */
async function loginWithAuth0(returnPath = '') {
  const client = await initAuth0();
  if (!client) return;

  try {
    // Store where to go back after login (e.g., #admin or #dashboard)
    if (returnPath) sessionStorage.setItem('pa_auth_redirect', returnPath);
    
    await client.loginWithRedirect({
      authorizationParams: {
        redirect_uri: window.location.origin + window.location.pathname
      }
    });
  } catch (err) {
    console.error('[Auth0] Login error:', err);
    if (window.showToast) showToast('Authentication failed', 'error');
  }
}

/** Logout from Auth0 */
async function logoutWithAuth0(returnPath = '') {
  const client = await initAuth0();
  sessionStorage.removeItem('pa_admin_auth');
  sessionStorage.removeItem('pa_auth_provider');
  
  if (client) {
    await client.logout({
      logoutParams: { 
        returnTo: window.location.origin + window.location.pathname + (returnPath || '')
      }
    });
  } else {
    location.reload();
  }
}

/** Check and handle redirect callback */
async function handleAuth0Callback() {
  const client = await initAuth0();
  if (!client) return null;

  const query = window.location.search;
  if (query.includes('code=') && query.includes('state=')) {
    try {
      const result = await client.handleRedirectCallback();
      const user = await client.getUser();
      console.log('[Auth0] Login success:', user.email);

      // Restore target path
      const target = sessionStorage.getItem('pa_auth_redirect') || '';
      sessionStorage.removeItem('pa_auth_redirect');

      // Clear URL params
      window.history.replaceState({}, document.title, window.location.origin + window.location.pathname + target);
      
      return user;
    } catch (err) {
      console.error('[Auth0] Callback error:', err);
      return null;
    }
  }
  return null;
}

/** Get Auth0 user profile */
async function getAuth0User() {
  const client = await initAuth0();
  if (!client) return null;
  
  const isAuthenticated = await client.isAuthenticated();
  if (!isAuthenticated) return null;
  
  return await client.getUser();
}

// Global exposure
window.Auth0Helper = {
  login:  loginWithAuth0,
  logout: logoutWithAuth0,
  handleCallback: handleAuth0Callback,
  getUser: getAuth0User,
  init: initAuth0
};
