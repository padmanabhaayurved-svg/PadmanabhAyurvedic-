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
    return !!(s && (s.phone || s.email || s.uid));
  }

  async function register(phone, name, password, userEmail = '') {
    const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
    const authEmail = (userEmail && userEmail.includes('@')) ? userEmail.trim().toLowerCase() : (cleanPhone + '@padmanabh.site');
    const passwordHash = await hashPassword(password);
    let userCred;
    
    try {
      userCred = await signUp(authEmail, password);
    } catch (e) {
      if (e.code === 'auth/email-already-in-use') {
        throw new Error('This account or email is already registered. Please login instead.');
      }
      console.warn("Firebase Auth Error, falling back to local:", e);
      const localAuth = JSON.parse(localStorage.getItem('pa_local_auth') || '{}');
      if (localAuth[cleanPhone] || (userEmail && localAuth[userEmail])) {
        throw new Error('This phone or email is already registered. Please login instead.');
      }
      const uid = 'local_' + Date.now();
      localAuth[cleanPhone] = { password, uid, email: userEmail || authEmail };
      if (userEmail) localAuth[userEmail] = { password, uid, phone: cleanPhone };
      localStorage.setItem('pa_local_auth', JSON.stringify(localAuth));
      userCred = { user: { uid } };
    }

    const uid = userCred.user.uid;
    const userData = { 
      phone: cleanPhone, 
      name, 
      email: userEmail || authEmail,
      uid, 
      registeredAt: new Date().toISOString(), 
      orderIds: [], 
      passwordHash 
    };
    
    // Store user by phone as key (and if email exists, also ensure lookup)
    await createOrUpdateUser(cleanPhone, userData);
    if (userEmail && userEmail !== cleanPhone) {
      await createOrUpdateUser(userEmail, userData);
    }

    _setSession({ phone: cleanPhone, name, email: userEmail || authEmail, uid });
    if (window.updateAuthUI) window.updateAuthUI();
    return userData;
  }

  async function login(identifier, password) {
    const raw = String(identifier || '').trim();
    const isEmail = raw.includes('@');
    const cleanPhone = raw.replace(/\D/g, '').slice(-10);
    const authEmail = isEmail ? raw.toLowerCase() : (cleanPhone + '@padmanabh.site');
    const lookupKey = isEmail ? raw.toLowerCase() : cleanPhone;
    const enteredHash = await hashPassword(password);
    
    let userData = await getUserByPhone(lookupKey);
    // If looked up by email and not found, try looking up by cleaned phone if 10 digits
    if (!userData && cleanPhone.length === 10) {
      userData = await getUserByPhone(cleanPhone);
    }
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
        userCred = await signIn(authEmail, password);
      } catch (e) {
        console.warn("Firebase Auth Error, falling back to local:", e);
        const localAuth = JSON.parse(localStorage.getItem('pa_local_auth') || '{}');
        const match = localAuth[lookupKey] || (cleanPhone.length === 10 ? localAuth[cleanPhone] : null);
        if (!match || match.password !== password) {
          throw new Error('Invalid phone number or password.');
        }
        userCred = { user: { uid: match.uid } };
      }
      uid = userCred.user.uid;
      loggedIn = true;

      // Auto-migrate legacy user: Save secure password hash to Firestore
      if (!userData) {
        userData = { 
          phone: cleanPhone || raw, 
          email: isEmail ? raw : (cleanPhone + '@padmanabh.site'),
          name: cleanPhone || raw, 
          uid, 
          lastLoginAt: new Date().toISOString(), 
          orderIds: [], 
          passwordHash: enteredHash 
        };
      } else {
        userData.passwordHash = enteredHash;
      }
    }

    // Update login status
    if (userData) {
      userData.lastLoginAt = new Date().toISOString();
      userData.uid = uid;
      await createOrUpdateUser(userData.phone || cleanPhone, userData);
    }

    _setSession({ 
      phone: userData.phone || cleanPhone, 
      name: userData.name, 
      email: userData.email || authEmail,
      uid 
    });
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

  async function loginWithGoogle() {
    if (!window.signInWithGoogle) throw new Error('Google Sign-In not initialized');
    const result = await window.signInWithGoogle();
    const user = result.user;
    const uid = user.uid;
    const email = user.email;
    const name = user.displayName || 'Google User';

    let userData = null;
    try {
      userData = await window.getUserByPhone(uid); // using uid as the doc id for google users too
    } catch(e) {}
    
    if (!userData) {
      userData = { email, name, uid, registeredAt: new Date().toISOString(), orderIds: [] };
      await window.createOrUpdateUser(uid, userData);
    }

    _setSession({ email, name: userData.name, uid });
    if (window.updateAuthUI) window.updateAuthUI();
    return userData;
  }

  return {
    getUser,
    isLoggedIn,
    register,
    login,
    loginWithGoogle,
    logout,
    requireAuth,
    hashPassword // Export to make hashing accessible in admin panel too!
  };
})();

window.PhoneAuth = PhoneAuth;
