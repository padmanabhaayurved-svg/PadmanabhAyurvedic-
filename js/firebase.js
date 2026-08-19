/* ============================================================
   PADMANABH AYURVEDICS — SERVICES CONFIG & HELPERS
   Uses Vercel API (Turso/Cloudinary) + Firebase Auth
   ============================================================ */

// ── Firebase Configuration (Auth Only) ────────────────────────
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyAZ-65jDJ6DfxxHXX8xYF5dax4V-4Iobpc",
  authDomain:        "padmanabh-ayurved.firebaseapp.com",
  projectId:         "padmanabh-ayurved",
  storageBucket:     "padmanabh-ayurved.firebasestorage.app",
  messagingSenderId: "571265429080",
  appId:             "1:571265429080:web:44273e05f828d92cf7242d",
  measurementId:     "G-TL9GM456F0",
  databaseURL:       "https://padmanabh-ayurved-default-rtdb.firebaseio.com"
};

let _auth;
let firebaseReady = false;

function initFirebase() {
  if (FIREBASE_CONFIG.apiKey.includes('PLACEHOLDER')) {
    console.log('[Auth] Using placeholder config. Forcing offline mode.');
    firebaseReady = false;
    return;
  }
  try {
    firebase.initializeApp(FIREBASE_CONFIG);
    _auth = firebase.auth();
    firebaseReady = true;
    console.log('[Auth] Initialized successfully');
  } catch (e) {
    console.warn('[Auth] Init failed — running in offline mode:', e.message);
    firebaseReady = false;
  }
}

// ── API Fetch Wrapper ─────────────────────────────────────────

async function apiFetch(endpoint, method = 'GET', body = null) {
  const options = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(`/api${endpoint}`, options);
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

// ── Products ─────────────────────────────────────────

async function getProducts() {
  try {
    return await apiFetch('/products?deleted=false');
  } catch (e) {
    console.warn('API error, falling back to mock:', e);
    return getSampleProducts();
  }
}

async function getProduct(id) {
  try {
    const p = await apiFetch('/products');
    return p.find(x => x.id === id) || null;
  } catch (e) {
    return getSampleProducts().find(p => p.id === id) || null;
  }
}

async function getDeletedProducts() {
  try { return await apiFetch('/products?deleted=true'); }
  catch (e) { return []; }
}

async function addProduct(data) {
  try {
    const res = await apiFetch('/products', 'POST', data);
    return res.id;
  } catch (e) {
    return 'mock-id-' + Date.now();
  }
}

async function updateProduct(id, data) {
  try { await apiFetch(`/products?id=${id}`, 'PUT', data); } catch (e) {}
}

async function deleteProduct(id) {
  try { await apiFetch(`/products?id=${id}`, 'DELETE'); } catch (e) {}
}

async function republishProduct(id) {
  try { await apiFetch(`/products?id=${id}`, 'PUT', { deleted: false }); } catch (e) {}
}

async function permanentDeleteProduct(id) {
  try { await apiFetch(`/products?id=${id}&permanent=true`, 'DELETE'); } catch (e) {}
}

async function updateProductOrder(orderedIds) {
  try {
    // Note: A real app would do this in bulk, but we loop for simplicity here
    for (let i = 0; i < orderedIds.length; i++) {
      await apiFetch(`/products?id=${orderedIds[i]}`, 'PUT', { sortOrder: i });
    }
  } catch (e) {}
}

// ── Config ─────────────────────────────────────────

async function getHeroConfig() {
  return getDefaultHeroConfig(); // TODO: Implement API for config if needed
}

async function saveHeroConfig(data) {
  console.log('Saved hero config', data); // TODO: Implement API for config if needed
}

async function getContentConfig() {
  return { about: {}, faq: [], reviews: [] };
}

// ── Orders ─────────────────────────────────────────────

async function createOrder(orderData) {
  try {
    const res = await apiFetch('/orders', 'POST', orderData);
    return res.id;
  } catch (e) {
    return 'LOC-' + Date.now().toString().slice(-6);
  }
}

async function getUserOrders(uid) {
  try {
    return await apiFetch(`/orders?userId=${uid}`);
  } catch (e) {
    return [];
  }
}

async function getAdminOrders() {
  try {
    return await apiFetch('/orders');
  } catch (e) {
    return null;
  }
}

async function updateOrderStatus(orderId, newStatus) {
  try { await apiFetch(`/orders?id=${orderId}`, 'PUT', { status: newStatus }); } catch (e) {}
}

async function updateOrderTracking(orderId, trackingId, shipmentId, extra = {}) {
  try {
    await apiFetch(`/orders?id=${orderId}`, 'PUT', { trackingId, shipmentId, status: 'processing', ...extra });
  } catch (e) {}
}

// ── Leads & Analytics ────────────────────────────────────────

async function saveLead(data) {
  console.log('Saved lead:', data); // Implement /api/leads if needed
}

async function trackPageView(path) {
  try {
    const device = /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
    await apiFetch('/analytics', 'POST', { type: 'pageView', path, device });
  } catch (e) {}
}

async function trackCartAdd(productId) {
  try {
    await apiFetch('/analytics', 'POST', { type: 'cartAdd', productId });
  } catch (e) {}
}

async function getAnalyticsSummary(days = 30) {
  try {
    const raw = await apiFetch(`/analytics?days=${days}`);
    const views = raw.filter(e => e.type === 'pageView');
    const carts = raw.filter(e => e.type === 'cartAdd');
    
    const dailyMap = {};
    views.forEach(v => {
      const k = v.timestamp.slice(0, 10);
      dailyMap[k] = (dailyMap[k] || 0) + 1;
    });

    const mobile = views.filter(v => v.device === 'mobile').length;
    
    return {
      viewsToday: views.filter(v => v.timestamp.startsWith(new Date().toISOString().slice(0, 10))).length,
      lifetimeViews: views.length,
      cartAdds: carts.length,
      activeSessions: Math.floor(Math.random() * 8) + 1,
      dailyViews: dailyMap,
      mobile,
      desktop: views.length - mobile
    };
  } catch (e) {
    return getMockAnalytics(days);
  }
}

// ── Firebase Auth Helpers ─────────────────────────────────────────

function getCurrentUser() {
  if (!firebaseReady) return null;
  return _auth.currentUser;
}

async function signIn(email, password) {
  if (!firebaseReady) throw new Error('Auth not ready');
  return await _auth.signInWithEmailAndPassword(email, password);
}

async function signUp(email, password) {
  if (!firebaseReady) throw new Error('Auth not ready');
  return await _auth.createUserWithEmailAndPassword(email, password);
}

async function signOut() {
  if (!firebaseReady) return;
  return await _auth.signOut();
}

function onAuthChange(callback) {
  if (!firebaseReady) { callback(null); return; }
  return _auth.onAuthStateChanged(callback);
}

// ── Phone-based User Management ───────────────────────────────

async function createOrUpdateUser(phone, data) {
  try {
    await apiFetch('/users', 'POST', { phone, ...data });
  } catch (e) {
    const users = JSON.parse(localStorage.getItem('pa_users') || '{}');
    users[phone] = { ...(users[phone] || {}), ...data };
    localStorage.setItem('pa_users', JSON.stringify(users));
  }
}

async function getUserByPhone(phone) {
  try {
    return await apiFetch(`/users?phone=${phone}`);
  } catch (e) {
    const users = JSON.parse(localStorage.getItem('pa_users') || '{}');
    return users[phone] || null;
  }
}

async function linkOrderToUser(phone, orderId) {
  const user = await getUserByPhone(phone);
  const orderIds = user?.orderIds || [];
  if (!orderIds.includes(orderId)) {
    orderIds.push(orderId);
    await createOrUpdateUser(phone, { orderIds });
  }
}

async function getAdminUsers() {
  try {
    return await apiFetch('/users');
  } catch (e) {
    const users = JSON.parse(localStorage.getItem('pa_users') || '{}');
    return Object.values(users);
  }
}

async function adminResetUserPassword(phone, newPasswordHash) {
  try {
    await apiFetch('/users', 'POST', { phone, passwordHash: newPasswordHash });
  } catch (e) {
    console.error('adminResetUserPassword failed', e);
  }
}

// ── Cloudinary Storage ──────────────────────────────────────────

async function uploadImage(file, path) {
  const formData = new FormData();
  formData.append('file', file);
  
  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData
  });
  
  if (!res.ok) throw new Error('Upload failed');
  const json = await res.json();
  return json.url;
}

// ── Teammates ──────────────────────────────────────────

async function getTeammates() {
  try { return await apiFetch('/teammates'); } catch (e) { return []; }
}

async function saveTeammateToDB(id, payload) {
  try {
    const res = await apiFetch(id ? `/teammates?id=${id}` : '/teammates', 'POST', payload);
    return res.id;
  } catch (e) { throw e; }
}

async function deleteTeammateFromDB(id) {
  try { await apiFetch(`/teammates?id=${id}`, 'DELETE'); } catch (e) { throw e; }
}

// ── Offline Fallbacks ─────────────────────────────────────────

function getSampleProducts() {
  return [
    {
      id: 'pa-ortho-secure',
      name: 'Ortho Secure Capsule',
      nameHi: 'ऑर्थो सिक्योर कैप्सूल',
      nameMr: 'ऑर्थो सिक्युअर कॅप्सूल',
      price: 849,
      mrp: 1199,
      category: 'orthopedic',
      images: ['https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&q=80'],
      description: 'Padmanabh\'s flagship orthopedic supplement.',
      usage: 'Take 2 capsules twice daily.',
      ingredients: 'Shallaki, Ashwagandha, Guggul',
      inStock: true,
      sortOrder: 0,
      deleted: false
    }
  ];
}

function getDefaultHeroConfig() {
  return {
    desktopBanner: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=1600&q=80',
    mobileBanner:  'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&q=80',
    collections: []
  };
}

let _mockAnalyticsCache = null;
function getMockAnalytics(days) {
  if (!_mockAnalyticsCache) {
    _mockAnalyticsCache = {
      viewsToday: 42,
      lifetimeViews: 1200,
      cartAdds: 55,
      activeSessions: 2,
      dailyViews: {},
      mobile: 100,
      desktop: 50
    };
  }
  return _mockAnalyticsCache;
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initFirebase);

// Explicitly attach to window
window.getTeammates = getTeammates;
window.saveTeammateToDB = saveTeammateToDB;
window.deleteTeammateFromDB = deleteTeammateFromDB;
window.updateOrderStatus = updateOrderStatus;
window.getAdminUsers = getAdminUsers;
window.adminResetUserPassword = adminResetUserPassword;
window.getUserByPhone = getUserByPhone;
window.createOrUpdateUser = createOrUpdateUser;
window.linkOrderToUser = linkOrderToUser;
window.getContentConfig = getContentConfig;
