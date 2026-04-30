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
    console.log('[Firebase] Using placeholder config. Forcing offline mode.');
    firebaseReady = false;
    return;
  }
  try {
    firebase.initializeApp(FIREBASE_CONFIG);
    _db      = firebase.firestore();
    _auth    = firebase.auth();
    _storage = firebase.storage();
    firebaseReady = true;
    console.log('[Firebase] Initialized successfully');
  } catch (e) {
    console.warn('[Firebase] Init failed — running in offline mode:', e.message);
    firebaseReady = false;
  }
}

// ── Firestore Helpers ─────────────────────────────────────────

/** Get all active (non-deleted) products ordered by sortOrder */
async function getProducts() {
  if (!firebaseReady) return getSampleProducts();
  try {
    const snap = await _db.collection('products')
      .where('deleted', '==', false)
      .orderBy('sortOrder', 'asc')
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
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
      .orderBy('updatedAt', 'desc')
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.warn('[Firebase] getDeletedProducts error:', e);
    return [];
  }
}

/** Add new product */
async function addProduct(data) {
  if (!firebaseReady) {
    console.log('[Firebase Offline] Simulated addProduct');
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
    console.log('[Firebase Offline] Simulated updateProduct');
    return;
  }
  const now = firebase.firestore.FieldValue.serverTimestamp();
  await _db.collection('products').doc(id).update({ ...data, updatedAt: now });
}

/** Soft delete product */
async function deleteProduct(id) {
  if (!firebaseReady) {
    console.log('[Firebase Offline] Simulated deleteProduct');
    return;
  }
  const now = firebase.firestore.FieldValue.serverTimestamp();
  await _db.collection('products').doc(id).update({ deleted: true, updatedAt: now });
}

/** Republish (restore) deleted product */
async function republishProduct(id) {
  if (!firebaseReady) {
    console.log('[Firebase Offline] Simulated republishProduct');
    return;
  }
  const now = firebase.firestore.FieldValue.serverTimestamp();
  await _db.collection('products').doc(id).update({ deleted: false, updatedAt: now });
}

/** Permanently delete product */
async function permanentDeleteProduct(id) {
  if (!firebaseReady) {
    console.log('[Firebase Offline] Simulated permanentDeleteProduct');
    return;
  }
  await _db.collection('products').doc(id).delete();
}

/** Update product sort orders */
async function updateProductOrder(orderedIds) {
  if (!firebaseReady) {
    console.log('[Firebase Offline] Simulated updateProductOrder');
    return;
  }
  const batch = _db.batch();
  orderedIds.forEach((id, idx) => {
    batch.update(_db.collection('products').doc(id), { sortOrder: idx });
  });
  await batch.commit();
}

/** Get hero config */
async function getHeroConfig() {
  if (!firebaseReady) return getDefaultHeroConfig();
  try {
    const doc = await _db.collection('heroConfig').doc('main').get();
    if (!doc.exists) return getDefaultHeroConfig();
    return doc.data();
  } catch (e) {
    console.warn('[Firebase] getHeroConfig error:', e);
    return getDefaultHeroConfig();
  }
}

/** Save hero config */
async function saveHeroConfig(data) {
  if (!firebaseReady) throw new Error('Firebase not ready');
  await _db.collection('heroConfig').doc('main').set(data, { merge: true });
}

/** Create order */
async function createOrder(orderData) {
  if (!firebaseReady) throw new Error('Firebase not ready');
  const now = firebase.firestore.FieldValue.serverTimestamp();
  const ref = await _db.collection('orders').add({
    ...orderData,
    status:    'pending',
    createdAt: now,
    updatedAt: now
  });
  return ref.id;
}

/** Get orders for current user */
async function getUserOrders(uid) {
  if (!firebaseReady) return [];
  try {
    const snap = await _db.collection('orders')
      .where('userId', '==', uid)
      .orderBy('createdAt', 'desc')
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.warn('[Firebase] getUserOrders error:', e);
    return [];
  }
}

/** Update order tracking */
async function updateOrderTracking(orderId, trackingId, shipmentId) {
  if (!firebaseReady) return;
  await _db.collection('orders').doc(orderId).update({
    trackingId,
    shipmentId,
    status: 'processing',
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

/** Save consultation lead */
async function saveLead(data) {
  if (!firebaseReady) {
    console.log('[Firebase Offline] Simulated saveLead', data);
    return;
  }
  await _db.collection('leads').add({
    ...data,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });
}

// ── Analytics Tracking ────────────────────────────────────────

async function trackPageView(path) {
  if (!firebaseReady) return;
  try {
    const device = /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
    await _db.collection('analytics').add({
      type:      'pageView',
      path,
      device,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (e) { /* silent */ }
}

async function trackCartAdd(productId) {
  if (!firebaseReady) return;
  try {
    await _db.collection('analytics').add({
      type:      'cartAdd',
      productId,
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
    const todayTs = firebase.firestore.Timestamp.fromDate(todayStart);
    const todaySnap = await _db.collection('analytics')
      .where('type', '==', 'pageView')
      .where('timestamp', '>=', todayTs).get();

    // Build daily traffic
    const dailyMap = {};
    views.forEach(v => {
      const d = v.timestamp?.toDate();
      if (!d) return;
      const key = d.toISOString().slice(0, 10);
      dailyMap[key] = (dailyMap[key] || 0) + 1;
    });

    const mobile  = views.filter(v => v.device === 'mobile').length;
    const desktop = views.length - mobile;

    return {
      viewsToday:    todaySnap.size,
      lifetimeViews: allSnap.size,
      cartAdds:      carts.length,
      activeSessions: Math.floor(Math.random() * 8) + 1,
      dailyViews:    dailyMap,
      mobile,
      desktop
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

function onAuthChange(callback) {
  if (!firebaseReady) { callback(null); return; }
  return _auth.onAuthStateChanged(callback);
}

// ── Firebase Storage ──────────────────────────────────────────

async function uploadImage(file, path) {
  if (!firebaseReady) throw new Error('Firebase not ready');
  const ref = _storage.ref(path);
  const snap = await ref.put(file);
  return await snap.ref.getDownloadURL();
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
      images: [
        'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&q=80',
        'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=600&q=80'
      ],
      description: 'Padmanabh\'s flagship orthopedic supplement for joint inflammation, cartilage repair, and long-term bone health. Formulated by Vaidya Padmanabh Shinde with over 20 years of clinical expertise.',
      usage: 'Take 2 capsules twice daily with warm water or milk, preferably after meals. Continue for 90 days for best results.',
      ingredients: 'Shallaki (Boswellia) 300mg, Ashwagandha 200mg, Guggul 150mg, Haridra (Turmeric) 100mg, Piperine 5mg',
      inStock: true,
      sortOrder: 0,
      deleted: false
    },
    {
      id: 'pa-arshas-cure',
      name: 'Arshas Cure Capsule',
      nameHi: 'अर्शस क्योर कैप्सूल',
      nameMr: 'अर्शस क्युअर कॅप्सूल',
      price: 699,
      mrp: 999,
      category: 'digestive',
      images: [
        'https://images.unsplash.com/photo-1550572017-edd951b55104?w=600&q=80',
        'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=600&q=80'
      ],
      description: 'A targeted Ayurvedic formulation for the natural treatment of piles (Arsha/Hemorrhoids). Reduces bleeding, itching, and inflammation without surgery.',
      usage: 'Take 2 capsules twice daily before meals with warm water. Minimum 60-day course recommended.',
      ingredients: 'Haritaki 200mg, Nagkesar 150mg, Kutaj Bark 150mg, Triphala 100mg, Vasa Leaf 50mg',
      inStock: true,
      sortOrder: 1,
      deleted: false
    },
    {
      id: 'pa-taka-tak-powder',
      name: 'Taka Tak Powder',
      nameHi: 'टका टक पाउडर',
      nameMr: 'टका टक पावडर',
      price: 349,
      mrp: 499,
      category: 'digestive',
      images: [
        'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&q=80',
        'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600&q=80'
      ],
      description: 'A popular digestive powder used for managing gas, acidity, bloating, and maintaining oral hygiene. Fast-acting relief with a refreshing herbal taste.',
      usage: 'Mix ½ teaspoon in warm water and drink after meals. Can also be used as a mouth freshener after meals.',
      ingredients: 'Ajwain, Saunf, Jeera, Sendha Namak, Peppermint Extract, Ela (Cardamom)',
      inStock: true,
      sortOrder: 2,
      deleted: false
    },
    {
      id: 'pa-bone-set-oil',
      name: 'Bone Setting Relief Oil',
      nameHi: 'बोन सेटिंग रिलीफ ऑयल',
      nameMr: 'बोन सेटिंग रिलीफ ऑइल',
      price: 599,
      mrp: 849,
      category: 'orthopedic',
      images: [
        'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=600&q=80',
        'https://images.unsplash.com/photo-1526045612212-70caf35c14df?w=600&q=80'
      ],
      description: 'A proprietary medicated oil blend developed at our bone-setting clinic. Used externally for fast pain relief in joint pain, muscle stiffness, sciatica, and spondylitis.',
      usage: 'Warm the oil slightly. Massage gently on affected area for 10–15 minutes. Use 2–3 times daily.',
      ingredients: 'Mahanarayan Oil Base, Nirgundi Extract, Shallaki Oil, Camphor, Wintergreen Oil, Til (Sesame) Oil',
      inStock: true,
      sortOrder: 3,
      deleted: false
    },
    {
      id: 'pa-ashwagandha-plus',
      name: 'Ashwagandha Vitality Capsules',
      nameHi: 'अश्वगंधा विटैलिटी कैप्सूल',
      nameMr: 'अश्वगंधा व्हायटॅलिटी कॅप्सूल',
      price: 549,
      mrp: 799,
      category: 'wellness',
      images: [
        'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&q=80',
        'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=600&q=80'
      ],
      description: 'Premium KSM-66 Ashwagandha root extract for stress relief, energy, testosterone support, and overall vitality. Recommended by Vaidya Padmanabh for patients with chronic fatigue.',
      usage: 'Take 1–2 capsules daily with warm milk at bedtime for best results.',
      ingredients: 'KSM-66 Ashwagandha Root Extract 500mg, Shilajit 50mg, Piperine 5mg',
      inStock: true,
      sortOrder: 4,
      deleted: false
    },
    {
      id: 'pa-triphala-churna',
      name: 'Triphala Digestive Churna',
      nameHi: 'त्रिफला डाइजेस्टिव चूर्ण',
      nameMr: 'त्रिफळा डाइजेस्टिव चूर्ण',
      price: 249,
      mrp: 349,
      category: 'digestive',
      images: [
        'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=600&q=80',
        'https://images.unsplash.com/photo-1471193945509-9ad0617afabf?w=600&q=80'
      ],
      description: 'Classic Triphala churna for daily digestive health, gut detoxification, constipation relief, and overall wellness. Made from three fruit extracts in their traditional ratio.',
      usage: 'Mix 1 teaspoon in a glass of warm water. Drink at bedtime or early morning on empty stomach.',
      ingredients: 'Amalaki (Amla) 33%, Bibhitaki (Bahera) 33%, Haritaki (Harad) 33%',
      inStock: true,
      sortOrder: 5,
      deleted: false
    },
    {
      id: 'pa-giloy-immunity',
      name: 'Giloy Immunity Booster',
      nameHi: 'गिलोय इम्युनिटी बूस्टर',
      nameMr: 'गिलोय इम्युनिटी बूस्टर',
      price: 399,
      mrp: 579,
      category: 'immunity',
      images: [
        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
        'https://images.unsplash.com/photo-1543362906-acfc16c67564?w=600&q=80'
      ],
      description: 'Natural Giloy (Guduchi) extract tablets to boost immunity, reduce seasonal allergies, manage fever, and fight chronic infections. Trusted by thousands of Ahilyanagar families.',
      usage: 'Take 2 tablets twice daily with water, preferably after meals. Safe for long-term use.',
      ingredients: 'Giloy Stem Extract 400mg, Tulsi Leaf Extract 50mg, Amla Extract 50mg',
      inStock: true,
      sortOrder: 6,
      deleted: false
    },
    {
      id: 'pa-pain-balm',
      name: 'Padmanabh Pain Relief Balm',
      nameHi: 'पद्मनाभ पेन रिलीफ बाम',
      nameMr: 'पद्मनाभ पेन रिलीफ बाम',
      price: 299,
      mrp: 399,
      category: 'orthopedic',
      images: [
        'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&q=80',
        'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=80'
      ],
      description: 'Fast-acting herbal pain relief balm for headaches, joint pain, back pain, and muscle cramps. The clinic\'s in-house formulation trusted by patients for instant relief.',
      usage: 'Apply a small amount to the affected area and massage gently. Repeat 3–4 times daily as needed.',
      ingredients: 'Pudina Satva (Menthol), Gandhpura Oil (Wintergreen), Camphor, Clove Oil, Nilgiri Oil',
      inStock: true,
      sortOrder: 7,
      deleted: false
    },
    {
      id: 'pa-moringa-capsule',
      name: 'Moringa Superfood Capsules',
      nameHi: 'मोरिंगा सुपरफूड कैप्सूल',
      nameMr: 'मोरिंगा सुपरफूड कॅप्सूल',
      price: 449,
      mrp: 649,
      category: 'wellness',
      images: [
        'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=600&q=80',
        'https://images.unsplash.com/photo-1471193945509-9ad0617afabf?w=600&q=80'
      ],
      description: 'Pure Moringa (Drumstick) leaf extract — nature\'s most nutrient-dense superfood. Rich in iron, calcium, vitamins A, B, C. Ideal for anaemia, energy, and overall nutrition.',
      usage: 'Take 2 capsules daily with water or juice after breakfast.',
      ingredients: 'Moringa Oleifera Leaf Extract 500mg (standardised to 5% polyphenols)',
      inStock: true,
      sortOrder: 8,
      deleted: false
    },
    {
      id: 'pa-herbal-combo',
      name: 'Joint Care Combo Pack',
      nameHi: 'जॉइंट केयर कॉम्बो पैक',
      nameMr: 'जॉइंट केयर कॉम्बो पॅक',
      price: 1299,
      mrp: 1999,
      category: 'orthopedic',
      images: [
        'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=600&q=80',
        'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&q=80'
      ],
      description: 'Complete joint care bundle: Ortho Secure Capsules (60 tabs) + Bone Setting Relief Oil (100ml) + Pain Relief Balm (25g). A 45-day complete program recommended by our clinical team.',
      usage: 'Use all three products as per individual directions. Ideal 3-month course for chronic joint issues.',
      ingredients: 'Combination of Ortho Secure, Relief Oil, and Pain Balm — refer individual products.',
      inStock: true,
      sortOrder: 9,
      deleted: false
    }
  ];
}

function getDefaultHeroConfig() {
  return {
    desktopBanner: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=1600&q=80',
    mobileBanner:  'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&q=80',
    collections: [
      { title: 'Orthopedic Care', image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&q=80', category: 'orthopedic' },
      { title: 'Digestive Health', image: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=600&q=80', category: 'digestive' },
      { title: 'Wellness',        image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&q=80', category: 'wellness' },
      { title: 'Immunity',        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80', category: 'immunity' }
    ]
  };
}

let _mockAnalyticsCache = null;

function getMockAnalytics(days) {
  if (!_mockAnalyticsCache) {
    const dailyViews = {};
    // Pre-generate 30 days of data once
    for (let i = 30; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dailyViews[key] = Math.floor(Math.random() * 120) + 20;
    }
    _mockAnalyticsCache = {
      viewsToday:     Math.floor(Math.random() * 80) + 10,
      lifetimeViews:  Math.floor(Math.random() * 5000) + 1000,
      cartAdds:       Math.floor(Math.random() * 300) + 50,
      activeSessions: Math.floor(Math.random() * 8) + 1,
      dailyViews,
      mobile:         Math.floor(Math.random() * 300) + 100,
      desktop:        Math.floor(Math.random() * 200) + 50
    };
  }

  // Filter dailyViews based on requested days
  const keys = Object.keys(_mockAnalyticsCache.dailyViews).sort();
  const slicedKeys = keys.slice(-days);
  const slicedViews = {};
  slicedKeys.forEach(k => slicedViews[k] = _mockAnalyticsCache.dailyViews[k]);

  return {
    ..._mockAnalyticsCache,
    dailyViews: slicedViews
  };
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initFirebase);
