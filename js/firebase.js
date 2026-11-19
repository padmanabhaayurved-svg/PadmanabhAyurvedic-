/* ============================================================
   PADMANABH AYURVEDICS — FIREBASE CONFIG & HELPERS
   Uses Firebase SDK v9 (compat CDN version)
   Replace placeholder values with your real Firebase config.
   ============================================================ */

// ── Firebase Configuration ────────────────────────────────────
// TODO: Replace with your actual Firebase project config
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

// ── Firebase App (compat SDK loaded via CDN in index.html) ────
let _db, _auth, _storage;
let firebaseReady = false;

function initFirebase() {
  if (FIREBASE_CONFIG.apiKey.includes('PLACEHOLDER')) {
    firebaseReady = false;
    return;
  }
  try {
    firebase.initializeApp(FIREBASE_CONFIG);
    _db      = firebase.firestore();
    window.pa_db = _db; // Expose globally for app.js, admin.js, about.html, home.html
    _auth    = firebase.auth();
    if (typeof firebase.storage === 'function') {
      _storage = firebase.storage();
    }
    firebaseReady = true;
  } catch (e) {
    console.warn('[Firebase] Init failed — running in offline mode:', e.message);
    firebaseReady = false;
  }

  // Defensive Mock Fallback to prevent crash when Firebase is offline
  if (!window.pa_db) {
    window.pa_db = {
      collection: () => ({
        add: async () => ({ id: 'mock-id-' + Date.now() }),
        doc: () => ({
          get: async () => ({ exists: false, data: () => ({}) }),
          set: async () => {},
          update: async () => {}
        })
      })
    };
  }

  // Expose getRedirectResult so admin/user pages can await it directly.
  // Stored as a function (not a called promise) so callers control timing.
  if (firebaseReady && _auth) {
    window._pa_getRedirectResult = () => _auth.getRedirectResult();
  }
}

// ── Firestore Helpers ─────────────────────────────────────────

/** Get all active (non-deleted) products ordered by sortOrder */
async function getProducts() {
  if (!firebaseReady) return getSampleProducts();
  try {
    const snap = await _db.collection('products')
      .where('deleted', '==', false)
      .get();
    const products = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => p.id !== 'pa-ortho-secure');
    if (products.length === 0) {
      return getSampleProducts();
    }
    return products.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  } catch (e) {
    console.warn('[Firebase] getProducts error:', e);
    return getSampleProducts();
  }
}

/** Get single product by ID */
async function getProduct(id) {
  if (!firebaseReady) {
    return getSampleProducts().find(p => p.id === id) || null;
  }
  try {
    const doc = await _db.collection('products').doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  } catch (e) {
    console.warn('[Firebase] getProduct error:', e);
    return null;
  }
}

/** Get deleted products (history archive) */
async function getDeletedProducts() {
  if (!firebaseReady) return [];
  try {
    const snap = await _db.collection('products')
      .where('deleted', '==', true)
      .get();
    const products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return products.sort((a, b) => {
      const tA = a.updatedAt?.toMillis?.() || 0;
      const tB = b.updatedAt?.toMillis?.() || 0;
      return tB - tA;
    });
  } catch (e) {
    console.warn('[Firebase] getDeletedProducts error:', e);
    return [];
  }
}

/** Add new product */
async function addProduct(data) {
  if (!firebaseReady) {
    return 'mock-id-' + Date.now();
  }
  const now = firebase.firestore.FieldValue.serverTimestamp();
  const count = (await _db.collection('products').get()).size;
  return await _db.collection('products').add({
    ...data,
    deleted:   false,
    sortOrder: count,
    createdAt: now,
    updatedAt: now
  });
}

/** Update product */
async function updateProduct(id, data) {
  if (!firebaseReady) {
    return;
  }
  const now = firebase.firestore.FieldValue.serverTimestamp();
  await _db.collection('products').doc(id).set({ ...data, updatedAt: now }, { merge: true });
}

/** Soft delete product */
async function deleteProduct(id) {
  if (!firebaseReady) {
    return;
  }
  const now = firebase.firestore.FieldValue.serverTimestamp();
  await _db.collection('products').doc(id).set({ deleted: true, updatedAt: now }, { merge: true });
}

/** Republish (restore) deleted product */
async function republishProduct(id) {
  if (!firebaseReady) {
    return;
  }
  const now = firebase.firestore.FieldValue.serverTimestamp();
  await _db.collection('products').doc(id).set({ deleted: false, updatedAt: now }, { merge: true });
}

/** Permanently delete product */
async function permanentDeleteProduct(id) {
  if (!firebaseReady) {
    return;
  }
  await _db.collection('products').doc(id).delete();
}

/** Update product sort orders */
async function updateProductOrder(orderedIds) {
  if (!firebaseReady) {
    return;
  }
  const batch = _db.batch();
  orderedIds.forEach((id, idx) => {
    batch.set(_db.collection('products').doc(id), { sortOrder: idx }, { merge: true });
  });
  await batch.commit();
}

/** Get hero config */
async function getHeroConfig() {
  const defaults = getDefaultHeroConfig();
  if (!firebaseReady) return defaults;
  try {
    const doc = await _db.collection('heroConfig').doc('main').get();
    if (!doc.exists) return defaults;
    const data = doc.data();
    // Merge with defaults to ensure all fields exist
    return {
      ...defaults,
      ...data,
      desktopBanner: data.desktopBanner || defaults.desktopBanner,
      mobileBanner:  data.mobileBanner  || defaults.mobileBanner
    };
  } catch (e) {
    console.warn('[Firebase] getHeroConfig error:', e);
    return defaults;
  }
}

/** Save hero config */
async function saveHeroConfig(data) {
  // 1. Clean & normalize data to ensure no undefined values
  const cleanData = {
    desktopBanner: Array.isArray(data.desktopBanner) ? data.desktopBanner.map(item => ({
      url: String(item?.url || '').trim(),
      link: String(item?.link || '').trim()
    })).filter(b => b.url) : [],
    mobileBanner: Array.isArray(data.mobileBanner) ? data.mobileBanner.map(item => ({
      url: String(item?.url || '').trim(),
      link: String(item?.link || '').trim()
    })).filter(b => b.url) : [],
    collections: Array.isArray(data.collections) ? data.collections.map(col => ({
      title: String(col?.title || '').trim(),
      image: String(col?.image || '').trim(),
      category: String(col?.category || 'wellness').trim(),
      link: String(col?.link || '').trim()
    })).filter(c => c.title || c.image) : []
  };

  // Try direct Firestore SDK if available
  if (firebaseReady && _db) {
    try {
      await _db.collection('heroConfig').doc('main').set(cleanData, { merge: true });
      return;
    } catch (sdkError) {
      console.warn('[Firebase] SDK heroConfig save failed, trying REST API fallback:', sdkError);
    }
  }

  // REST API Fallback to Firestore (ensures Admin can publish even if SDK is unauthenticated/offline)
  const restPayload = {
    fields: {
      desktopBanner: {
        arrayValue: {
          values: cleanData.desktopBanner.map(b => ({
            mapValue: {
              fields: {
                url: { stringValue: b.url },
                link: { stringValue: b.link }
              }
            }
          }))
        }
      },
      mobileBanner: {
        arrayValue: {
          values: cleanData.mobileBanner.map(b => ({
            mapValue: {
              fields: {
                url: { stringValue: b.url },
                link: { stringValue: b.link }
              }
            }
          }))
        }
      },
      collections: {
        arrayValue: {
          values: cleanData.collections.map(c => ({
            mapValue: {
              fields: {
                title: { stringValue: c.title },
                image: { stringValue: c.image },
                category: { stringValue: c.category },
                link: { stringValue: c.link }
              }
            }
          }))
        }
      }
    }
  };

  const res = await fetch(`https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents/heroConfig/main`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(restPayload)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to save via REST API (${res.status}): ${errText}`);
  }
}

/** Create order */
async function createOrder(orderData) {
  try {
    if (!firebaseReady) throw new Error('Firebase not ready');
    const now = firebase.firestore.FieldValue.serverTimestamp();
    const ref = await _db.collection('orders').add({
      ...orderData,
      status:        'pending',
      courierCompany: orderData.courierCompany || '',
      courierCharge:  orderData.courierCharge || 0,
      srOrderId:      null,
      shipmentId:     null,
      awb:            null,
      srStatus:       null,
      createdAt:     now,
      updatedAt:     now
    });
    return ref.id;
  } catch (e) {
    console.warn('[Firebase] createOrder failed. Simulating local order.', e);
    // Return a simulated ID so cart.html can save it to localStorage
    return 'LOC-' + Date.now().toString().slice(-6);
  }
}

/** Get orders for current user */
async function getUserOrders(uid) {
  if (!firebaseReady) return [];
  try {
    const snap = await _db.collection('orders')
      .where('userId', '==', uid)
      .get();
    const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return orders.sort((a, b) => {
      const tA = a.createdAt?.toMillis?.() || 0;
      const tB = b.createdAt?.toMillis?.() || 0;
      return tB - tA;
    });
  } catch (e) {
    console.warn('[Firebase] getUserOrders error:', e);
    return [];
  }
}

/** Get ALL orders (admin use) — reads from Firestore */
async function getAdminOrders() {
  if (!firebaseReady) return null; // null signals "use localStorage fallback"
  try {
    const snap = await _db.collection('orders')
      .orderBy('createdAt', 'desc')
      .limit(500)
      .get();
    return snap.docs.map(d => {
      const data = d.data();
      // Convert Firestore Timestamps to ISO strings for consistent handling
      return {
        id: d.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString?.() || data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() || data.updatedAt || null
      };
    }).filter(o => !o._deleted);
  } catch (e) {
    console.warn('[Firebase] getAdminOrders error:', e.message);
    return null; // null signals "use localStorage fallback"
  }
}

async function updateOrderStatus(orderId, newStatus) {
  if (!firebaseReady) return;
  await _db.collection('orders').doc(orderId).update({
    status: newStatus,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

async function updateOrderTracking(orderId, trackingId, shipmentId, extra = {}) {
  if (!firebaseReady) return;
  await _db.collection('orders').doc(orderId).update({
    trackingId,
    shipmentId,
    status: 'processing',
    courierCompany: extra.courierCompany || '',
    courierCharge:  extra.courierCharge || 0,
    srOrderId:      extra.srOrderId || null,
    awb:            extra.awb || null,
    courierName:    extra.courierName || '',
    srStatus:       extra.srStatus || null,
    ...extra,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

/** Save consultation lead */
async function saveLead(data) {
  if (!firebaseReady) {
    return;
  }
  await _db.collection('leads').add({
    ...data,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });
}

// ── Analytics Tracking ────────────────────────────────────────

// Generate or retrieve persistent visitor ID
function getVisitorId() {
  let vid = localStorage.getItem('pa_vid');
  if (!vid) {
    vid = 'v_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    localStorage.setItem('pa_vid', vid);
  }
  return vid;
}

function getVisitorContext() {
  const user = _auth && _auth.currentUser;
  let ref = document.referrer || 'Direct';
  if (ref.includes('google.com')) ref = 'Google Search';
  else if (ref.includes('instagram.com')) ref = 'Instagram';
  else if (ref.includes('facebook.com')) ref = 'Facebook';
  else if (ref.includes('padmanabhayurved')) ref = 'Internal';
  
  return {
    visitorId: getVisitorId(),
    email: user ? user.email : null,
    uid: user ? user.uid : null,
    referrer: ref
  };
}

async function trackPageView(path) {
  if (!firebaseReady) return;
  try {
    const device = /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
    await _db.collection('analytics').add({
      type: 'pageView',
      path,
      device,
      ...getVisitorContext(),
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (e) { /* silent */ }
}

async function trackCartAdd(productId) {
  if (!firebaseReady) return;
  try {
    await _db.collection('analytics').add({
      type: 'cartAdd',
      productId,
      ...getVisitorContext(),
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (e) { /* silent */ }
}

/** Get analytics summary for admin */
async function getAnalyticsSummary(days = 30) {
  if (!firebaseReady) return getMockAnalytics(days);
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffTs = firebase.firestore.Timestamp.fromDate(cutoff);

    const snap = await _db.collection('analytics')
      .where('timestamp', '>=', cutoffTs)
      .orderBy('timestamp', 'asc')
      .get();

    const events = snap.docs.map(d => d.data());
    const views  = events.filter(e => e.type === 'pageView');
    const carts  = events.filter(e => e.type === 'cartAdd');

    // All-time total
    const allSnap = await _db.collection('analytics')
      .where('type', '==', 'pageView').get();

    // Today's views
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const viewsToday = views.filter(v => v.timestamp?.toDate() >= todayStart).length;

    // Build daily traffic
    const dailyMap = {};
    for (let i = days; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dailyMap[d.toISOString().slice(0, 10)] = 0;
    }
    views.forEach(v => {
      const d = v.timestamp?.toDate();
      if (!d) return;
      const key = d.toISOString().slice(0, 10);
      dailyMap[key] = (dailyMap[key] || 0) + 1;
    });

    const mobile  = views.filter(v => v.device === 'mobile').length;
    const desktop = views.length - mobile;

    // Group events by visitorId for live visitor tracking
    const visitorsMap = {};
    events.forEach(e => {
      const vid = e.visitorId || 'Anonymous';
      if (!visitorsMap[vid]) {
        visitorsMap[vid] = {
          visitorId: vid,
          email: e.email || null,
          device: e.device || 'Unknown',
          referrer: e.referrer || 'Direct',
          events: [],
          lastActive: e.timestamp
        };
      }
      visitorsMap[vid].events.push(e);
      if (e.email) visitorsMap[vid].email = e.email;
      if (e.timestamp && (!visitorsMap[vid].lastActive || e.timestamp > visitorsMap[vid].lastActive)) {
        visitorsMap[vid].lastActive = e.timestamp;
      }
    });

    const activeVisitors = Object.values(visitorsMap).sort((a,b) => {
      const tA = a.lastActive ? a.lastActive.toMillis() : 0;
      const tB = b.lastActive ? b.lastActive.toMillis() : 0;
      return tB - tA;
    });

    return {
      viewsToday:    viewsToday,
      lifetimeViews: allSnap.size,
      cartAdds:      carts.length,
      activeSessions: activeVisitors.length,
      dailyViews:    dailyMap,
      mobile,
      desktop,
      recentEvents:  events.slice(-50).reverse(),
      activeVisitors: activeVisitors
    };
  } catch (e) {
    console.warn('[Firebase] getAnalyticsSummary error:', e);
    return getMockAnalytics(days);
  }
}

// ── Firebase Auth ─────────────────────────────────────────────

function getCurrentUser() {
  if (!firebaseReady) return null;
  return _auth.currentUser;
}

async function signIn(email, password) {
  if (!firebaseReady) throw new Error('Firebase not ready');
  return await _auth.signInWithEmailAndPassword(email, password);
}

async function signUp(email, password) {
  if (!firebaseReady) throw new Error('Firebase not ready');
  return await _auth.createUserWithEmailAndPassword(email, password);
}

async function signOut() {
  if (!firebaseReady) return;
  return await _auth.signOut();
}

async function signInWithGoogle() {
  if (!firebaseReady) throw new Error('Firebase not ready');
  const provider = new firebase.auth.GoogleAuthProvider();
  // Using popup for better reliability and keeping app state/hash intact.
  return await _auth.signInWithPopup(provider);
}

function onAuthChange(callback) {
  if (!firebaseReady) { callback(null); return; }
  return _auth.onAuthStateChanged(callback);
}

// ── Phone-based User Management ───────────────────────────────

async function createOrUpdateUser(phone, data) {
  if (!firebaseReady) {
    const users = JSON.parse(localStorage.getItem('pa_users') || '{}');
    users[phone] = { ...(users[phone] || {}), ...data };
    localStorage.setItem('pa_users', JSON.stringify(users));
    return;
  }
  try {
    await _db.collection('users').doc(phone).set(data, { merge: true });
  } catch (e) {
    console.warn('[Firebase] createOrUpdateUser error:', e);
    const users = JSON.parse(localStorage.getItem('pa_users') || '{}');
    users[phone] = { ...(users[phone] || {}), ...data };
    localStorage.setItem('pa_users', JSON.stringify(users));
  }
}

async function getUserByPhone(phone) {
  const localUsers = JSON.parse(localStorage.getItem('pa_users') || '{}');
  if (!firebaseReady) return localUsers[phone] || null;
  try {
    const doc = await _db.collection('users').doc(phone).get();
    if (doc.exists) {
      const data = doc.data();
      localUsers[phone] = data;
      localStorage.setItem('pa_users', JSON.stringify(localUsers));
      return data;
    }
    return localUsers[phone] || null;
  } catch (e) {
    console.warn('[Firebase] getUserByPhone error:', e);
    return localUsers[phone] || null;
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

// ── Firebase Storage ──────────────────────────────────────────

async function uploadImage(file, path) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', 'padmanabh_store');
  
  const res = await fetch('https://api.cloudinary.com/v1_1/ybzj1wn7/image/upload', {
    method: 'POST',
    body: formData
  });
  
  if (!res.ok) {
    throw new Error('Image upload failed');
  }
  
  const data = await res.json();
  return data.secure_url;
}

// ── Offline Fallbacks ─────────────────────────────────────────

function getSampleProducts() {
  return [
  {
    "id": "AJPmfzNdKV7Sj9yt3Odi",
    "nameMr": "अर्शस-क्योर कैप्सूल",
    "descriptionHi": "अर्शस-क्योर कैप्सूल – बवासीर के लिए आयुर्वेदिक सहयोग\n\nअर्शस-क्योर एक पारंपरिक आयुर्वेदिक हर्बल फॉर्मूलेशन है, जिसे बवासीर (मुळव्याध) से जुड़ी समस्याओं में आयुर्वेदिक देखभाल के लिए तैयार किया गया है। इसका सुविधाजनक कैप्सूल स्वरूप इसे आपकी दैनिक स्वास्थ्य दिनचर्या में आसानी से शामिल करने योग्य बनाता है।\n\nन ऑपरेशन • न इंजेक्शन\nबवासीर के लिए आयुर्वेदिक देखभाल\n\nउत्पाद के लेबल पर दिए निर्देशों के अनुसार या आयुर्वेदिक चिकित्सक की सलाह से सेवन करें।",
    "usage": "Take at least one capsule daily with water, approximately one hour before a meal, or as advised by a healthcare professional.",
    "sortOrder": 2,
    "description": "A traditional Ayurvedic herbal formulation developed to support people dealing with piles (hemorrhoids). Arshas-Cure is designed as a convenient, non-surgical wellness approach that can be incorporated into your daily routine.\n\nNo Operation • No Injection\nAyurvedic Care for Piles\n\nUse regularly as directed on the product label or as advised by an Ayurvedic physician.",
    "category": "wellness",
    "weight": 0.1,
    "nameHi": "अर्शस-क्योर कैप्सूल",
    "price": 900,
    "deleted": false,
    "mrp": 999,
    "inStock": true,
    "ingredients": "Nagkesar (Mesua ferrea) – 100 mg\nHaritaki (Terminalia chebula) – 90 mg\nBibhitaki (Terminalia bellirica) – 70 mg\nAmla (Phyllanthus emblica) – 80 mg\nDaruhaldi (Berberis aristata) – 80 mg\nNeelkanthi (Wrightia tinctoria) – 80 mg",
    "name": "Arsha cure",
    "images": [
      "https://res.cloudinary.com/ybzj1wn7/image/upload/v1791388090/products/kswj149xynntx6dd7xnj.png",
      "https://res.cloudinary.com/ybzj1wn7/image/upload/v1791388092/products/ny2r12iykkvbwwukzta4.png",
      "https://res.cloudinary.com/ybzj1wn7/image/upload/v1791388095/products/jkslvcmjzljbnxp5dvto.png",
      "https://drive.google.com/thumbnail?id=15GxmfE5CK4Or34NqFXYuzJiGe-1EF8PP&sz=800"
    ],
    "descriptionMr": "अर्शस-क्योर हे पारंपरिक आयुर्वेदिक हर्बल फॉर्म्युलेशन असून मुळव्याधीशी संबंधित त्रासांमध्ये आयुर्वेदिक काळजीसाठी तयार करण्यात आले आहे. कॅप्सूलचे सोयीस्कर स्वरूप आपल्या दैनंदिन आरोग्य दिनचर्येत सहज समाविष्ट करता येते.\n\nऑपरेशन नाही • इंजेक्शन नाही\nमुळव्याधीसाठी आयुर्वेदिक काळजी\n\nउत्पादनाच्या लेबलवरील निर्देशांनुसार ���िंवा आयुर्वेदिक डॉक्टरांच्या सल्ल्यानुसार सेवन करावे.\n\nShort marketing headline:\n“मुळव्याधीच्या त्रासासाठी आयुर्वेदिक काळजी — ऑपरेशन नाही, इंजेक्शन नाही.”"
  },
  {
    "id": "29ywAvr0BRxF3Q4WWkTZ",
    "ingredients": "Karela (Bitter Gourd) (Momordica charantia) – 100 mg\n\nJamun Beej (Syzygium cumini) – 100 mg\n\nGudmar Leaf (Gymnema sylvestre) – 80 mg\n\nVijaysar Heartwood (Pterocarpus marsupium) – 70 mg\n\nMethika (Fenugreek) (Trigonella foenum-graecum) – 60 mg\n\nAmla Fruit (Phyllanthus emblica) – 50 mg\n\nGiloy (Guduchi) (Tinospora cordifolia) – 40 mg",
    "nameHi": "",
    "descriptionMr": "ग्लुकोआयुष प्लस (Glucoayush Plus) हे पद्मनाभ आयुर्वेदचे एक आयुर्वेदिक डायटरी सप्लिमेंट आहे, जे रक्तातील साखरेचे प्रमाण नैसर्गिकरीत्या नियंत्रित ठेवण्यासाठी, ग्लुकोजची पातळी संतुलित राखण्यासाठी आणि चयापचय आरोग्य सुधारण्यासाठी तयार केले गेले आहे.",
    "deleted": false,
    "images": [
      "https://res.cloudinary.com/ybzj1wn7/image/upload/v1791388078/products/cxlvgtktrtskmkfhclpa.png",
      "https://res.cloudinary.com/ybzj1wn7/image/upload/v1791388081/products/awiqaetzhtki3j7bmbqp.png",
      "https://res.cloudinary.com/ybzj1wn7/image/upload/v1791388084/products/p42kutjfqaeic2isrlyc.png",
      "https://res.cloudinary.com/ybzj1wn7/image/upload/v1791388087/products/iqjrmqnul1mehzani55c.png"
    ],
    "collection": "",
    "inStock": true,
    "mrp": 1450,
    "sortOrder": 3,
    "weight": 0.1,
    "price": 1200,
    "description": "Glucoayush Plus by Padmnabh Aayurved is an Ayurvedic dietary supplement formulated to naturally regulate blood glucose levels, optimize metabolic health, and promote vitality.",
    "category": "immunity",
    "name": "Glucoayush plus",
    "nameMr": "Glucoayush plus",
    "descriptionHi": "ग्लूकोआयुष प्लस (Glucoayush Plus) पद्मनाभ आयुर्वेद का एक हर्बल डाइटरी सप्लीमेंट है, जिसे ब्लड शुगर लेवल को संतुलित रखने, ग्लूकोज मेटाबॉलिज्म में सुधार करने और समग्र स्वास्थ्य को बनाए रखने के लिए तैयार किया गया है।",
    "usage": "Take 1 capsule daily with water, approximately 1 hour before a meal (or as directed by a healthcare professional).\n\nNote: Not recommended for pregnant or lactating women without consulting a doctor."
  },
  {
    "id": "UYouEPU3gncoClAXtSSO",
    "collection": "",
    "nameMr": "ऑर्थो सिक्योर आयुर्वेदिक कैप्सूल",
    "name": "Ortho secure capsule",
    "description": "ORTHO SECURE Ayurvedic Capsules\n60 Capsules | MRP ₹799/- | Made in India\n\nOrtho Secure is an Ayurvedic herbal capsule designed to provide daily support for joint mobility, flexibility, lubrication and overall bone & muscle wellness.\n\nKey Benefits:\n\nSupports joint flexibility and mobility\nSupports bone and muscle strength\nHelps support comfortable movement\nSupports everyday joint wellness\nAyurvedic herbal formulation",
    "sortOrder": 4,
    "ingredients": "Shallaki (Boswellia serrata) – 100 mg | Nirgundi (Vitex negundo) – 80 mg | Rasna (Pluchea lanceolata) – 80 mg | Ashwagandha (Withania somnifera) – 70 mg | Guduchi (Tinospora cordifolia) – 70 mg | Shunthi (Zingiber officinale) – 50 mg | Erand Mool (Ricinus communis) – 50 mg.",
    "descriptionHi": "ऑर्थो सिक्योर आयुर्वेदिक कैप्सूल\n60 कैप्सूल | MRP ₹799/- | भारत में निर्मित\n\nऑर्थो सिक्योर एक आयुर्वेदिक हर्बल कैप्सूल है, जिसे जोड़ों की लचील��पन, गतिशीलता, लुब्रिकेशन तथा हड्डियों और मांसपेशियों के संपूर्ण स्वास्थ्य के लिए दैनिक सहायता प्रदान करने के उद्देश्य से तैयार किया गया है।\n\nमुख्य लाभ:\n\nजोड़ों की लचीलापन और गतिशीलता में सहायता\nहड्डियों और मांसपेशियों की मजबूती में सहायता\nआरामदायक गतिविधियों के लिए सहायता\nदैनिक जोड़ों के स्वास्थ्य के लिए उपयोगी\nआयुर्वेदिक हर्बल फॉर्मूलेशन",
    "category": "orthopedic",
    "usage": "Take 1 capsule twice daily after meals, or as directed by your Ayurvedic physician/healthcare professional. Swallow with water. Do not exceed the recommended daily dosage.",
    "descriptionMr": "ऑर्थो सिक्योर आयुर्वेदिक कॅप्सूल\n60 कॅप्सूल | MRP ₹799/- | भारतात निर्मित\n\nऑर्थो सिक्योर हे एक आयुर्वेदिक हर्बल कॅप्सूल असून, सांध्यांची लवचिकता, हालचाल, सांध्यांचे लुब्रिकेशन तसेच हाडे व स्नायूंच्या एकूण आरोग्यासाठी दैनंदिन सहाय्य देण्याच्या उद्देशाने तयार केले आहे.\n\nमुख्य फायदे:\n\nसांध्यांची लवचिकता व हालचालींना सहाय्य\nहाडे व स्नायूंच्या मजबुतीस सहाय्य\nआरामदायी हालचालींसाठी सहाय्य\nदैनंदिन सांधे आरोग्यासाठी उपयुक्त\nआयुर्वेदिक हर्बल फॉर्म्युलेशन",
    "weight": 0.1,
    "deleted": false,
    "nameHi": "ऑर्थो सिक्योर आयुर्वेदिक कैप्सूल",
    "mrp": 799,
    "inStock": true,
    "price": 799,
    "images": [
      "https://res.cloudinary.com/ybzj1wn7/image/upload/v1791388099/products/e6k0gxvc8fdp6zqphlgq.jpg",
      "https://res.cloudinary.com/ybzj1wn7/image/upload/v1791388101/products/noc7u3ntbs3zfarmgyqa.jpg",
      "https://drive.google.com/thumbnail?id=1EgJSD8KwRQeWF0bc-6VgcuQGXM-JpvBi&sz=800"
    ]
  },
  {
    "id": "cDwrYTduo7W8MEwxc9m0",
    "ingredients": "हरड़ (Terminalia chebula) — 125 mg\nबहेड़ा (Terminalia bellirica) — 125 mg\nआंवला (Phyllanthus emblica) — 150 mg\nअजवाइन (Trachyspermum ammi) — 50 mg\nजीरा (Cuminum cyminum) — 25 mg\nसौंफ (Foeniculum vulgare) — 25 mg\n\nकुल मात्रा: 500 mg प्रति कैप्सूल",
    "descriptionMr": "TAKATAK Herbal Capsule हे हरड, बेहडा, आवळा, ओवा, जिरे आणि बडीशेप यांसारख्या पारंपरिक आयुर्वेदिक वनौषधींच्या मिश्रणापासून तयार केलेले हर्बल फॉर्म्युलेशन आहे. हे निरोगी पचनक्रिया, आतड्यांचे आरोग्य आणि पचनासंबंधी आराम य���ंना सपोर्ट करण्यासाठी तयार करण्यात आले आहे.\n\nमुख्य फायदे\n🌿 निरोगी पचनक्रियेला सपोर्ट करते\n🌿 आतड्यांच्या आरोग्यास सपोर्ट करते\n🌿 पचनासंबंधी आराम राखण्यास मदत करते\n🌿 अधूनमधून होणाऱ्या पोटफुगी व जडपणामध्ये मदत\n🌿 एकूण पचन आरोग्यास सपोर्ट करते",
    "nameMr": "टकाटक हर्बल कैप्सूल",
    "usage": "Take at least 1 capsule daily with water, approximately one hour before each meal, or as advised by a healthcare professional.\n\nCaution\nNot recommended for pregnant or lactating women.\nConsult a healthcare professional before use.\nStore in a cool, dry and dark place.\nProtect from direct sunlight, heat and moisture.\nKeep out of reach of children.\nThis product is not intended to diagnose, treat, cure or prevent any disease.",
    "mrp": 699,
    "collection": "",
    "description": "TAKATAK Herbal Capsule is an Ayurvedic herbal formulation made with a blend of traditional herbs including Harad, Baheda, Amla, Ajwain, Jeera and Saunf. The formulation is designed to support healthy digestion, gut health and digestive comfort, and may help with occasional bloating and heaviness.\n\nIts combination of traditional Ayurvedic ingredients makes it suitable as part of a balanced daily wellness routine.\n\nKey Benefits\n🌿 Supports healthy digestion\n🌿 Supports gut health\n🌿 Helps maintain digestive comfort\n🌿 Helps with occasional bloating\n🌿 Supports overall digestive wellness",
    "nameHi": "टकाटक हर्बल  कैप्सूल",
    "images": [
      "https://res.cloudinary.com/ybzj1wn7/image/upload/v1791388111/products/oqw83up2pagv3kf6qnh7.jpg",
      "https://res.cloudinary.com/ybzj1wn7/image/upload/v1791388113/products/mdg1vhq2gfqdc6hhcd9t.jpg",
      "https://res.cloudinary.com/ybzj1wn7/image/upload/v1791388115/products/o0auheyha7poy2jllfsj.jpg"
    ],
    "category": "digestive",
    "sortOrder": 5,
    "price": 699,
    "name": "Takatak Herbal Capsule",
    "deleted": false,
    "inStock": true,
    "weight": 0.1,
    "descriptionHi": "TAKATAK Herbal Capsule एक आयुर्वेदिक हर्बल फॉर्मूलेशन है, जिसमें हरड़, बहेड़ा, आंवला, अजवाइन, जीरा और सौंफ जैसे पारंपरिक हर्बल घटकों का संयोजन है। यह फॉर्मूलेशन पाचन तंत्र और आंतों के स्वास्थ्य को सपोर्ट करने तथा पाचन संबंधी आराम बनाए रखने के लिए तैयार किया गया है।\n\nमुख्य लाभ\n🌿 स्वस्थ पाचन को सपोर्ट करता है\n🌿 आंतों के स्वास्थ्य को सपोर्ट करता है\n🌿 पाचन संबंधी आराम बनाए रखने में सहायक\n🌿 कभी-कभी होने वाली पेट की फूलने/भारीपन की समस्या में सहायता\n🌿 समग्र पाचन स्वास्थ्य को सपोर्ट करता है"
  },
  {
    "id": "XCAx3WvxOFCmChdNIwAH",
    "name": "Taka tak",
    "ingredients": "",
    "usage": "",
    "descriptionMr": "",
    "description": "",
    "inStock": true,
    "deleted": false,
    "nameMr": "",
    "sortOrder": 6,
    "images": [
      "https://res.cloudinary.com/ybzj1wn7/image/upload/v1791388106/products/vu435rx72vn4w0z0cmnm.jpg"
    ],
    "price": 2342,
    "height": 1,
    "nameHi": "",
    "category": "wellness",
    "weight": 0.5,
    "mrp": 2434,
    "descriptionHi": ""
  },
  {
    "id": "aOyXIZuoHVs6aLfUZBev",
    "nameMr": "टकाटक पाउडर",
    "deleted": false,
    "inStock": true,
    "descriptionHi": "टकाटक एक आयुर्वेदिक हर्बल पाउडर है, जिसमें पारंपरिक वनौषधीय सामग्री और विभिन्न प्रकार के नमक शामिल हैं। उत्पाद के पैकेज के अनुसार, यह पाचन स्वास्थ्य, नियमित मल त्याग और पेट के आराम के लिए तैयार किया गया है। इसे रात के भोजन के बाद गुनगुने पानी के साथ लेने के लिए बताया गया है।",
    "category": "digestive",
    "price": 399,
    "name": "Takatak",
    "descriptionMr": "टकाटक हे एक आयुर्वेदिक हर��बल पावडर आहे, ज्यामध्ये पारंपरिक वनौषधी घटक आणि विविध प्रकारचे मीठ समाविष्ट आहे. उत्पादनाच्या पॅकेजिंगनुसार, हे पचन आरोग्य, नियमित मलविसर्जन आणि पोटाच्या आरामासाठी तयार केलेले आहे. रात्रीच्या जेवणानंतर कोमट पाण्यासोबत घेण्याच्या सूचना दिल्या आहेत.",
    "description": "TATAK is an Ayurvedic herbal powder formulated with traditional herbal ingredients and salts. As described on the product packaging, it is intended to support digestive wellness, bowel regularity, and overall gut comfort. It is designed to be taken with warm water after dinner.",
    "collection": "",
    "sortOrder": 6,
    "weight": 0.5,
    "mrp": 472,
    "usage": "2–4 g powder at bedtime, or as advised by a physician. Instructions: Take 2–4 g after dinner with warm water.",
    "nameHi": "टकाटक पाउडर",
    "images": [
      "https://res.cloudinary.com/ybzj1wn7/image/upload/v1791388108/products/deuszq9ook0ulbyvyz2x.jpg"
    ],
    "ingredients": "Terminalia bellirica (Bibhitaki) Terminalia chebula (Haritaki) Rock Salt Cassia angustifolia (Senna) Chebulic Myrobalan Liquorice Root Black Salt"
  }
];
}

function getDefaultHeroConfig() {
  return {
    desktopBanner: [
      { url: 'https://res.cloudinary.com/ybzj1wn7/image/upload/v1791388122/products/vrukox6az8it8lm7vwce.png', link: '#product/AJPmfzNdKV7Sj9yt3Odi' },
      { url: 'https://res.cloudinary.com/ybzj1wn7/image/upload/v1791388125/products/qg27g7ea1t56aq9rkg90.png', link: '#product/UYouEPU3gncoClAXtSSO' },
      { url: 'https://res.cloudinary.com/ybzj1wn7/image/upload/v1791388128/products/qgtbe0pdrmbtdh3echwx.png', link: '#product/29ywAvr0BRxF3Q4WWkTZ' }
    ],
    mobileBanner: [
      { url: 'https://res.cloudinary.com/ybzj1wn7/image/upload/v1791388131/products/fu9kdhueyu7a1ijhqw8c.png', link: '#product/AJPmfzNdKV7Sj9yt3Odi' },
      { url: 'https://drive.google.com/thumbnail?id=1zMGqzXQ3tsp5uxSc0OvfqMIHK-jtte5x&sz=800', link: '#product/UYouEPU3gncoClAXtSSO' },
      { url: 'https://res.cloudinary.com/ybzj1wn7/image/upload/v1791388135/products/kei7z4jeuqp84tlhqfbz.png', link: '#product/29ywAvr0BRxF3Q4WWkTZ' },
      { url: 'https://res.cloudinary.com/ybzj1wn7/image/upload/v1791388138/products/eakffsntzxtbnkltp3u4.png', link: '' }
    ],
    collections: [
      { title: 'Arshas-Cure', image: 'https://res.cloudinary.com/ybzj1wn7/image/upload/v1791388140/products/thtvrdoqcnwqagi6hcpx.png', category: 'wellness', link: 'https://www.padmanabhayurved.com/#product/AJPmfzNdKV7Sj9yt3Odi' },
      { title: 'Taka-Tak', image: 'https://res.cloudinary.com/ybzj1wn7/image/upload/v1791388142/products/xsxfpnycwmoipxkhkv9l.jpg', category: 'immunity', link: 'https://www.padmanabhayurved.com/#product/cDwrYTduo7W8MEwxc9m0' },
      { title: 'Wellness', image: 'https://res.cloudinary.com/ybzj1wn7/image/upload/v1791388144/products/bsu1udstocqwkjfl6iqd.png', category: 'wellness', link: 'https://www.padmanabhayurved.com/#product/cDwrYTduo7W8MEwxc9m0' },
      { title: 'Immunity', image: 'https://res.cloudinary.com/ybzj1wn7/image/upload/v1791388147/products/eifd9nkkcrh0sio8jigm.jpg', category: 'wellness', link: 'https://www.padmanabhayurved.com/#product/UYouEPU3gncoClAXtSSO' },
      { title: 'Takatak', image: 'https://res.cloudinary.com/ybzj1wn7/image/upload/v1791388149/products/qjv0a1ffwva06zp93kto.jpg', category: 'wellness', link: 'https://www.padmanabhayurved.com/#product/aOyXIZuoHVs6aLfUZBev' }
    ]
  };
}

let _mockAnalyticsCache = null;

function getMockAnalytics(days) {
  if (!_mockAnalyticsCache) {
    const dailyViews = {};
    for (let i = 30; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dailyViews[key] = 0;
    }
    _mockAnalyticsCache = {
      viewsToday: 0,
      lifetimeViews: 0,
      cartAdds: 0,
      activeSessions: 0,
      dailyViews,
      mobile: 0,
      desktop: 0
    };
  }

  const keys = Object.keys(_mockAnalyticsCache.dailyViews).sort();
  const slicedKeys = keys.slice(-days);
  const slicedViews = {};
  slicedKeys.forEach(k => slicedViews[k] = _mockAnalyticsCache.dailyViews[k]);

  return {
    ..._mockAnalyticsCache,
    dailyViews: slicedViews,
    recentEvents: [],
    activeVisitors: []
  };
}

// Initialize on load or immediately if DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFirebase);
} else {
  initFirebase();
}


/** ── Teammate Helpers ────────────────────────────────────────── **/

async function getTeammates() {
  if (!firebaseReady) return [];
  try {
    const snap = await _db.collection('teammates').get();
    let data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    data.sort((a, b) => (a.order !== undefined ? a.order : 999) - (b.order !== undefined ? b.order : 999));
    return data;
  } catch (err) {
    console.error('getTeammates failed', err);
    return [];
  }
}

async function saveTeammateToDB(id, payload) {
  if (!firebaseReady) {
    console.warn('[Firebase] Firebase not ready, returning null');
    return null;
  }
  try {
    if (id) {
      await _db.collection('teammates').doc(id).set(payload, { merge: true });
      return id;
    } else {
      const docRef = await _db.collection('teammates').add({ ...payload, createdAt: new Date().toISOString() });
      return docRef.id;
    }
  } catch (err) {
    console.error('saveTeammate failed', err);
    throw err;
  }
}

async function deleteTeammateFromDB(id) {
  if (!firebaseReady) return;
  try {
    await _db.collection('teammates').doc(id).delete();
  } catch (err) {
    console.error('deleteTeammate failed', err);
    throw err;
  }
}

async function getAdminUsers() {
  if (!firebaseReady) {
    const users = JSON.parse(localStorage.getItem('pa_users') || '{}');
    return Object.values(users);
  }
  try {
    const snapshot = await _db.collection('users').get();
    const list = [];
    snapshot.forEach(doc => {
      list.push(doc.data());
    });
    return list;
  } catch (e) {
    console.error('[Firebase] getAdminUsers error:', e);
    const users = JSON.parse(localStorage.getItem('pa_users') || '{}');
    return Object.values(users);
  }
}

async function adminResetUserPassword(phone, newPasswordHash) {
  if (!firebaseReady) {
    const users = JSON.parse(localStorage.getItem('pa_users') || '{}');
    if (users[phone]) {
      users[phone].passwordHash = newPasswordHash;
      localStorage.setItem('pa_users', JSON.stringify(users));
    }
    const localAuth = JSON.parse(localStorage.getItem('pa_local_auth') || '{}');
    if (localAuth[phone]) {
      localAuth[phone].passwordHash = newPasswordHash;
      localStorage.setItem('pa_local_auth', JSON.stringify(localAuth));
    }
    return;
  }
  try {
    await _db.collection('users').doc(phone).update({ passwordHash: newPasswordHash });
  } catch (e) {
    console.error('[Firebase] adminResetUserPassword error:', e);
    throw e;
  }
}

async function getContentConfig() {
  const defaults = { about: {}, faq: [], reviews: [] };
  if (!firebaseReady) return defaults;
  try {
    const doc = await _db.collection('config').doc('content').get();
    return doc.exists ? doc.data() : defaults;
  } catch (e) {
    console.warn('[Firebase] getContentConfig error:', e);
    return defaults;
  }
}

// Explicitly attach to window
window.getTeammates = getTeammates;
window.saveTeammateToDB = saveTeammateToDB;
window.deleteTeammateFromDB = deleteTeammateFromDB;
window.updateOrderStatus = updateOrderStatus;
window.getAdminOrders = getAdminOrders;

// Update arbitrary fields on an order document (used after Shiprocket push)
window.updateOrderFields = async function(orderId, fields) {
  if (!firebaseReady) {
    // Fallback to localStorage
    const stored = JSON.parse(localStorage.getItem('pa_orders') || '[]');
    const idx = stored.findIndex(o => o.id === orderId);
    if (idx !== -1) { Object.assign(stored[idx], fields); localStorage.setItem('pa_orders', JSON.stringify(stored)); }
    return;
  }
  await _db.collection('orders').doc(orderId).update({
    ...fields,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
};
window.getAdminUsers = getAdminUsers;
window.adminResetUserPassword = adminResetUserPassword;
window.getUserByPhone = getUserByPhone;
window.createOrUpdateUser = createOrUpdateUser;
window.linkOrderToUser = linkOrderToUser;
window.getContentConfig = getContentConfig;


window.signInWithGoogle = signInWithGoogle;
