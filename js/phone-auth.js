/* ============================================================
   PADMANABH AYURVEDICS — PHONE AUTHENTICATION
   Phone + password account system via Firebase Auth
   ============================================================ */

const PhoneAuth = (() => {
  // SHA-256 password hashing helper
  async function hashPassword(password) {
    const msgUint8 = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }

  function _getSession() {
    try {
      return JSON.parse(localStorage.getItem('pa_user_session') || 'null');
    } catch { return null; }
  }

  function _setSession(data) {
    localStorage.setItem('pa_user_session', JSON.stringify(data));
  }

  function _clearSession() {
    localStorage.removeItem('pa_user_session');
  }

  function getUser() {
    return _getSession();
  }

  function isLoggedIn() {
    const s = _getSession();
    return !!(s && s.phone);
  }

  async function register(phone, name, password) {
    const email = phone + '@padmanabh.site';
    const passwordHash = await hashPassword(password);
    let userCred;
    
    try {
      userCred = await signUp(email, password);
    } catch (e) {
      if (e.code === 'auth/email-already-in-use') {
        throw new Error('This phone number is already registered. Please login instead.');
      }
      console.warn("Firebase Auth Error, falling back to local:", e);
      const localAuth = JSON.parse(localStorage.getItem('pa_local_auth') || '{}');
      if (localAuth[phone]) {
        throw new Error('This phone number is already registered. Please login instead.');
      }
      const uid = 'local_' + Date.now();
      localAuth[phone] = { password, uid };
      localStorage.setItem('pa_local_auth', JSON.stringify(localAuth));
      userCred = { user: { uid } };
    }

    const uid = userCred.user.uid;
    const userData = { phone, name, uid, registeredAt: new Date().toISOString(), orderIds: [], passwordHash };
    await createOrUpdateUser(phone, userData);

    _setSession({ phone, name, uid });
    if (window.updateAuthUI) window.updateAuthUI();
    return userData;
  }

  async function login(phone, password) {
    const email = phone + '@padmanabh.site';
    const enteredHash = await hashPassword(password);
    
    let userData = await getUserByPhone(phone);
    let uid = '';
    let loggedIn = false;

    // 1. If passwordHash exists in Firestore, authenticate using it
    if (userData && userData.passwordHash) {
      if (userData.passwordHash === enteredHash) {
        uid = userData.uid || 'usr_' + Date.now();
        loggedIn = true;
      } else {
        throw new Error('Invalid phone number or password.');
      }
    }

    // 2. Otherwise, check Firebase Auth / Local Storage
    if (!loggedIn) {
      let userCred;
      try {
        userCred = await signIn(email, password);
      } catch (e) {
        console.warn("Firebase Auth Error, falling back to local:", e);
        const localAuth = JSON.parse(localStorage.getItem('pa_local_auth') || '{}');
        if (!localAuth[phone] || localAuth[phone].password !== password) {
          throw new Error('Invalid phone number or password.');
        }
        userCred = { user: { uid: localAuth[phone].uid } };
      }
      uid = userCred.user.uid;
      loggedIn = true;

      // Auto-migrate legacy user: Save secure password hash to Firestore
      if (!userData) {
        userData = { phone, name: phone, uid, lastLoginAt: new Date().toISOString(), orderIds: [], passwordHash: enteredHash };
      } else {
        userData.passwordHash = enteredHash;
      }
    }

    // Update login status
    if (userData) {
      userData.lastLoginAt = new Date().toISOString();
      userData.uid = uid;
      await createOrUpdateUser(phone, userData);
    } else {
      userData = { phone, name: phone, uid, lastLoginAt: new Date().toISOString(), orderIds: [], passwordHash: enteredHash };
      await createOrUpdateUser(phone, userData);
    }

    _setSession({ phone, name: userData.name, uid });
    if (window.updateAuthUI) window.updateAuthUI();
    return userData;
  }

  async function logout() {
    try { await signOut(); } catch (e) { /* ignore */ }
    _clearSession();
    if (window.updateAuthUI) window.updateAuthUI();
  }

  function requireAuth(redirectHash) {
    if (!isLoggedIn()) {
      if (redirectHash) navigate(redirectHash);
      return false;
    }
    return true;
  }

  return {
    getUser,
    isLoggedIn,
    register,
    login,
    logout,
    requireAuth,
    hashPassword // Export to make hashing accessible in admin panel too!
  };
})();

window.PhoneAuth = PhoneAuth;
