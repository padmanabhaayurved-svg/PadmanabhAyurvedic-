if (window.__PA_INITIALIZED__) {
  console.log('[App] Already initialized. Skipping duplicate execution.');
} else {
  window.__PA_INITIALIZED__ = true;


/* ============================================================
   PADMANABH AYURVEDICS — APP.JS
   SPA Router · i18n · Toast · Page Loader · Nav
   ============================================================ */

// ── i18n ──────────────────────────────────────────────────────
let _lang    = localStorage.getItem('pa_lang') || 'en';
let _strings = {};

async function loadStrings(lang) {
  try {
    const res = await fetch(`i18n/${lang}.json`);
    _strings = await res.json();
  } catch (e) {
    console.warn('[i18n] Failed to load', lang, '— falling back to en');
    if (lang !== 'en') {
      const res = await fetch('i18n/en.json');
      _strings = await res.json();
    }
  }
}

function t(key) {
  return _strings[key] || key;
}

function applyStrings() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const val = t(key);
    // Use innerHTML to support <br>, <em>, <strong> in translation values
    el.innerHTML = val;
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    el.placeholder = t(el.getAttribute('data-i18n-ph'));
  });
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === _lang);
  });
  document.body.className = document.body.className
    .replace(/\blang-\w+\b/g, '')
    .trim() + ` lang-${_lang}`;
}

async function setLang(lang) {
  _lang = lang;
  localStorage.setItem('pa_lang', lang);
  await loadStrings(lang);
  applyStrings();
  // Re-render current page to update dynamic content
  const route = _currentRoute;
  _currentRoute = null;
  navigate(route, true);
}

// ── Toast ─────────────────────────────────────────────────────
function showToast(msg, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(20px)';
    el.style.transition = 'all 0.3s ease';
    setTimeout(() => el.remove(), 300);
  }, duration);
}
window.showToast = showToast;

// ── Modals ────────────────────────────────────────────────────
function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add('hidden');
  }
}
window.closeModal = closeModal;

// ── Global Image Reliability System ──────────────────────────
// Reliable SVG fallback — works 100% offline, no external dependency
const FALLBACK_IMG = `data:image/svg+xml;base64,${btoa(`<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'><rect width='400' height='400' fill='%231a1a1a'/><g fill='%23c9a84c' opacity='0.5'><circle cx='200' cy='160' r='50'/><path d='M130 270 Q200 220 270 270 Q200 310 130 270'/><path d='M170 130 Q200 100 230 130'/></g><text x='200' y='330' text-anchor='middle' fill='%23c9a84c' font-size='14' font-family='serif'>Padmanabh Ayurvedics</text></svg>`)}`;

function initImageFixer() {
  console.log('[ImageFixer] Active — Watching for broken renders.');
  // Capture image errors globally
  window.addEventListener('error', (e) => {
    if (e.target.tagName === 'IMG') {
      fixBrokenImage(e.target);
    }
  }, true);

  // Periodic check for broken images (naturalWidth === 0)
  setInterval(() => {
    document.querySelectorAll('img').forEach(img => {
      if (img.complete && img.naturalWidth === 0 && img.src && !img.dataset.fixing) {
        fixBrokenImage(img);
      }
    });
  }, 3000);
}

function fixBrokenImage(img) {
  if (img.dataset.fixing === 'done') return;
  img.dataset.fixing = 'true';
  
  const original = img.src || '';

  // 1. Try to fix Google Drive links
  if (original.includes('drive.google.com') && !original.includes('lh3.googleusercontent.com')) {
    if (window.Store && Store.convertDriveLink) {
      const fixed = Store.convertDriveLink(original);
      if (fixed !== original) {
        img.onerror = () => {
          img.src = FALLBACK_IMG;
          img.dataset.fixing = 'done';
          img.parentElement?.classList?.remove('loading-skeleton');
        };
        img.src = fixed;
        return;
      }
    }
  }

  // 2. Apply guaranteed fallback (inline SVG — no network needed)
  img.src = FALLBACK_IMG;
  img.dataset.fixing = 'done';
  
  // 3. Clean up UI states
  img.parentElement?.classList?.remove('loading-skeleton');
}

// ── Cinematic Boot Sequence ───────────────────────────────────
function runInitializationSequence() {
  console.log('[App] Starting initialization sequence...');
  initImageFixer(); // Start watching early
  const loader = document.getElementById('page-loader');
  const splash = document.getElementById('lang-splash');

  // ── Returning visitor: lang already chosen — go straight to app ──
  const langAlreadySet = localStorage.getItem('pa_lang');
  if (langAlreadySet) {
    console.log('[App] Returning visitor (' + langAlreadySet + ') — skipping intro, loading app.');
    // Both elements start as display:none in HTML — nothing to hide
    startApp();
    return;
  }

  // ── First-time visitor: reveal loader, then lang splash ──
  const quoteEl = document.getElementById('loader-quote');
  if (loader && quoteEl && splash) {
    // Show the loader (it starts hidden in HTML)
    loader.style.display = 'flex';

    const quotes = [
      "\"Health is a state of complete harmony of the body, mind and spirit.\"",
      "\"When diet is wrong, medicine is of no use. When diet is correct, medicine is of no need.\"",
      "\"The groundwork of all happiness is health.\"",
      "\"To ensure good health: eat lightly, breathe deeply, live moderately, cultivate cheerfulness.\""
    ];
    quoteEl.textContent = quotes[Math.floor(Math.random() * quotes.length)];
    setTimeout(() => { quoteEl.style.opacity = '1'; }, 500);

    // After 3.5 s hide loader and show language picker
    setTimeout(() => {
      console.log('[App] Hiding loader, showing lang splash...');
      loader.style.display = 'none';
      if (loader.parentNode) loader.remove();

      splash.style.display = 'flex';

      document.querySelectorAll('.splash-lang-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          console.log('[App] Language selected:', btn.dataset.lang);
          splash.style.display = 'none';
          if (splash.parentNode) splash.remove();
          await setLang(btn.dataset.lang);
          window.scrollTo({ top: 0, behavior: 'instant' });
          startApp();
        });
      });
    }, 3500);

  } else {
    // Elements missing — just start the app immediately
    console.log('[App] Overlay elements missing, starting app directly.');
    startApp();
  }
}

async function startApp() {
  trackTraffic();

  // Bind navbar language switcher
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => setLang(btn.dataset.lang));
  });

  // Initial Auth UI update
  updateAuthUI();

  // Navigate to initial route
  let hash = location.hash || '#home';
  if (!location.hash) hash = '#home'; // Default to home if directly loading /
  
  if (hash === '#dashboard') {
    hash = '#home';
    setTimeout(() => { if (window.openUserDrawer) openUserDrawer(); }, 500);
  }

  await navigate(hash);
  
  // Hide loader for returning visitors now that the page is fully injected
  const loader = document.getElementById('page-loader');
  if (loader) {
    loader.style.opacity = '0';
    setTimeout(() => {
      loader.style.display = 'none';
      if (loader.parentNode) loader.remove();
    }, 500);
  }

  // Dispatch app:ready for animations (specifically hero)
  document.dispatchEvent(new Event('app:ready'));
  
  // Start lead catcher timer after app has actually started
  // initLeadCatcherTimer(); // Disabled to prevent popup issues
}

// ── Router ────────────────────────────────────────────────────
let _currentRoute = null;
Object.defineProperty(window, '_currentRoute', {
  get: () => _currentRoute,
  set: (v) => { _currentRoute = v; },
  configurable: true
});
const _pageCache  = {};

const ROUTES = {
  '':          'pages/home.html',
  'home':      'pages/home.html',
  'about':     'pages/about.html',
  'catalog':   'pages/catalog.html',
  'product':   'pages/product.html',

  'cart':      'pages/cart.html',
  'admin':     'pages/admin.html'
};

async function navigate(hash, force = false) {
  hash = (hash || '').replace(/^#\/?/, '');
  const [page, param] = hash.split('/');
  const route = page || '';

  if (route === _currentRoute && !force) return;

  // If someone tries to navigate to dashboard via JS
  if (route === 'dashboard') {
    openUserDrawer();
    return;
  }

  const src = ROUTES[route];
  if (!src) { navigate('home', true); return; }

  const app = document.getElementById('app');
  app.classList.add('transitioning');

  await new Promise(r => setTimeout(r, 150));

  try {
    let html;
    if (_pageCache[src]) {
      html = _pageCache[src];
    } else {
      const res = await fetch(src);
      html = await res.text();
      _pageCache[src] = html;
    }

    if (html.trim().toLowerCase().startsWith('<!doctype') || html.toLowerCase().includes('<html')) {
      console.error('[Router] Security Alert: Server returned full index.html instead of partial:', src);
      app.innerHTML = '<div class="container section text-center"><h2>Routing Error</h2><p>The server returned a full page instead of a content snippet. Please check your local server configuration.</p></div>';
      app.classList.remove('transitioning');
      return;
    }

    app.innerHTML = html;
    app.classList.remove('transitioning');
    _currentRoute = route;

    // Update URL hash without triggering another navigation
    if (window.location.hash !== '#' + hash) {
      window.history.pushState(null, '', '#' + hash);
    }

    // Execute inline <script> tags (innerHTML does not run scripts)
    app.querySelectorAll('script').forEach(oldScript => {
      const newScript = document.createElement('script');
      [...oldScript.attributes].forEach(attr => newScript.setAttribute(attr.name, attr.value));
      newScript.textContent = oldScript.textContent;
      oldScript.replaceWith(newScript);
    });

    app.classList.remove('transitioning');
    window.scrollTo({ top: 0, behavior: 'instant' });

    _currentRoute = route;

    // Track page view
    trackPageView('#' + hash).catch(() => {});

    // Update nav active state
    updateNavActive(route);

    // Toggle main site navigation and UI elements
    const navbar = document.getElementById('navbar');
    const mobileNav = document.getElementById('mobile-nav');
    const siteFooter = document.getElementById('site-footer');
    const fabContainer = document.querySelector('.fab-container');
    const floatingMobileNav = document.getElementById('floating-mobile-nav');

    if (route === 'admin') {
      if (navbar) navbar.style.display = 'none';
      if (mobileNav) mobileNav.style.display = 'none';
      if (siteFooter) siteFooter.style.display = 'none';
      if (fabContainer) fabContainer.style.display = 'none';
      if (floatingMobileNav) floatingMobileNav.style.display = 'none';
    } else {
      if (navbar) navbar.style.display = '';
      if (mobileNav) mobileNav.style.display = '';
      if (siteFooter) siteFooter.style.display = '';
      if (fabContainer) fabContainer.style.display = '';
      if (floatingMobileNav) floatingMobileNav.style.display = '';

      // Special case for cart FAB
      const floatCart = document.getElementById('floating-cart-btn');
      if (floatCart) {
        floatCart.style.display = route === 'cart' ? 'none' : 'flex';
      }
    }

    // Run page init
    const inits = {
      '':          initHome,
      'home':      initHome,
      'about':     initAbout,
      'catalog':   initCatalog,
      'product':   () => initProduct(param),

      'cart':      initCart,
      'dashboard': initDashboard,
      'admin':     initAdmin
    };
    if (inits[route]) {
      if (route === 'admin') {
        import('./admin.js').then(mod => {
          if(mod.initAdmin) mod.initAdmin();
        }).catch(err => console.error("Admin module not available locally:", err));
      }
      
      if (route === 'earn') {
        const earnForm = document.getElementById('earn-form');
        if (earnForm) {
          earnForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button');
            btn.disabled = true;
            btn.textContent = 'Submitting...';
            
            const data = {
              name: document.getElementById('earn-name').value,
              email: document.getElementById('earn-email').value,
              phone: document.getElementById('earn-phone').value,
              city: document.getElementById('earn-city').value,
              experience: document.getElementById('earn-experience').value,
              timestamp: new Date().toISOString()
            };
            
            try {
              await window.pa_db.collection('earnLeads').add(data);
              showToast('Application submitted successfully!', 'success');
              earnForm.reset();
            } catch (error) {
              console.error('Error submitting earn application', error);
              showToast('Failed to submit application', 'error');
            } finally {
              btn.disabled = false;
              btn.textContent = 'Submit Application';
            }
          });
        }
      }
      inits[route]();
    }

    applyStrings();
    initScrollAnimations();
  } catch (e) {
    console.error('[Router] Failed to load page:', src, e);
    app.innerHTML = '<div class="container section text-center"><h2>Page not found</h2></div>';
    app.classList.remove('transitioning');
  }
}

function updateNavActive(route) {
  document.querySelectorAll('.nav-link, .mobile-nav-link, .glass-pill-link').forEach(el => {
    el.classList.toggle('active', el.dataset.route === route || (route === '' && el.dataset.route === 'home'));
  });
}

// ── Navbar scroll effect ──────────────────────────────────────
function initNavbar() {
  const nav = document.getElementById('navbar');
  if (!nav) return;
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Hamburger
  const burger = document.getElementById('hamburger');
  const mobileNav = document.getElementById('mobile-nav');
  if (burger && mobileNav) {
    burger.addEventListener('click', () => {
      burger.classList.toggle('open');
      mobileNav.classList.toggle('open');
    });
    mobileNav.querySelectorAll('.mobile-nav-link').forEach(link => {
      link.addEventListener('click', () => {
        burger.classList.remove('open');
        mobileNav.classList.remove('open');
      });
    });
  }

  // Nav link clicks
  document.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', () => navigate(el.dataset.nav));
  });
}

// ── Hash routing ──────────────────────────────────────────────
window.addEventListener('hashchange', () => navigate(location.hash));

// ── Page Initialisers (stubs — full logic in page HTML) ──────

function initHome()      { setTimeout(() => document.dispatchEvent(new Event('page:home')), 50); }
function initAbout()     { setTimeout(() => document.dispatchEvent(new Event('page:about')), 50); }
function initCatalog()   { setTimeout(() => document.dispatchEvent(new Event('page:catalog')), 50); }
function initProduct(id) { setTimeout(() => document.dispatchEvent(new CustomEvent('page:product', { detail: { id } })), 50); }
function initCart()      { setTimeout(() => document.dispatchEvent(new Event('page:cart')), 50); }
function initDashboard() { setTimeout(() => document.dispatchEvent(new Event('page:dashboard')), 50); }
function initAdmin()     { setTimeout(() => document.dispatchEvent(new Event('page:admin')), 50); }

// ── Global nav helper ─────────────────────────────────────────
window.navigate = navigate;

// ── Boot ──────────────────────────────────────────────────────
async function boot() {
  console.log('[App] Booting...');
  try {
    await loadStrings(_lang);
    initNavbar();
    applyStrings();

    // Cart icon click
    const cartBtn = document.getElementById('cart-btn');
    if (cartBtn) cartBtn.addEventListener('click', () => navigate('cart'));
  } catch (e) {
    console.error('[App] Boot error:', e);
  } finally {
    // Start cinematic initialization sequence (always runs)
    runInitializationSequence();
  }
}

document.addEventListener('DOMContentLoaded', boot);

// Handle Hash Change (Back/Forward buttons)
window.addEventListener('hashchange', () => {
  const hash = window.location.hash || '#home';
  navigate(hash);
});

// Intercept all form submissions to prevent accidental reloads in SPA
document.addEventListener('submit', e => {
  if (e.target.closest('#admin-login-form') || e.target.closest('#product-form')) {
    e.preventDefault();
    console.log('[App] Intercepted form submit for:', e.target.id);
  }
});

// ── Animations & Tracking ─────────────────────────────────────
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

  document.querySelectorAll('.animate-on-scroll:not(.is-visible)').forEach(el => {
    observer.observe(el);
  });
}

async function trackTraffic() {
  if (sessionStorage.getItem('pa_tracked')) return;
  try {
    const res = await fetch('https://ipapi.co/json/');
    const data = await res.json();
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    const visitData = {
      ip: data.ip,
      location: `${data.city}, ${data.region}, ${data.country_name}`,
      device: isMobile ? 'Mobile' : 'Desktop',
      userAgent: navigator.userAgent
    };
    
    console.log('[Analytics] Recording visit in Firebase:', visitData);
    
    if (window.trackPageView) {
      await trackPageView('visit:' + visitData.location);
    }
    
    sessionStorage.setItem('pa_tracked', 'true');
  } catch(e) {
    console.warn('Traffic tracking failed', e);
  }
}

// ── Chatbot & Lead Catcher ────────────────────────────────────
function initLeadCatcherTimer() {
  // 10 Second Lead Catcher
  if (!sessionStorage.getItem('pa_lead_shown')) {
    setTimeout(() => {
      const leadModal = document.getElementById('lead-modal');
      if (leadModal) {
        leadModal.classList.remove('hidden');
        sessionStorage.setItem('pa_lead_shown', 'true');
      }
    }, 60000);
  }
}

document.addEventListener('DOMContentLoaded', () => {

  // Handle Lead Form
  const leadForm = document.getElementById('lead-form');
  if (leadForm) {
    leadForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = leadForm.querySelector('button');
      const originalText = btn.textContent;
      btn.textContent = "Sending...";
      btn.disabled = true;

      const data = {
        name: document.getElementById('lead-name').value,
        phone: document.getElementById('lead-phone').value,
        location: document.getElementById('lead-location').value,
        service: document.getElementById('lead-service').value
      };

      try {
        console.log('[Lead Captured] Sending to Firebase', data);
        
        if (window.saveLead) {
          await saveLead(data);
        } else {
          // Fallback to localStorage if Firebase helper is missing
          let leads = [];
          try { leads = JSON.parse(localStorage.getItem('pa_leads') || '[]'); } catch(e){}
          leads.unshift({ ...data, timestamp: new Date().toISOString() });
          localStorage.setItem('pa_leads', JSON.stringify(leads));
        }

        closeModal('lead-modal');
        showToast('Thank you! Our expert will contact you soon.', 'success');
      } catch (err) {
        showToast('Something went wrong. Please try again.', 'error');
      } finally {
        btn.textContent = originalText;
        btn.disabled = false;
      }
    });
  }

  // ── CHATBOT INTELLIGENCE ENGINE ─────────────────────────────
  const chatBtn = document.getElementById('chatbot-btn');
  const chatWindow = document.getElementById('chatbot-window');
  const chatClose = document.getElementById('chatbot-close');
  const chatSend = document.getElementById('chat-send');
  const chatInput = document.getElementById('chat-input');
  const chatBody = document.getElementById('chat-body');

  // Context & state
  let chatCtx = {
    flow: null,             // null | 'checkout' | 'consultation'
    flowStep: null,         // substate within a flow
    lastIntent: null,       // last detected intent
    lastProduct: null,      // product ID for context-aware follow-ups
    lastProductName: null,  // cached name
    lastTopic: null,        // 'detail' | 'price' | 'ingredients' | 'usage' | 'recommendation'
    user: { name: '', phone: '', uid: '', isLoggedIn: false },
    consult: { symptoms: '', duration: '', priorTreatment: '', age: '', preferredTime: '' },
    lang: 'en',
    conversation: []        // [{ role, text }] last 10 for context
  };

  let faqCache = [];
  let idleTimer = null;

  // ── Symptom → Product Map (Feature 2) ──────────────────────
  const SYMPTOM_MAP = {
    knee:      ['pa-ortho-secure', 'pa-ortho-relief-oil', 'pa-pain-balm'],
    joint:     ['pa-ortho-secure', 'pa-ortho-relief-oil'],
    back:      ['pa-ortho-relief-oil', 'pa-pain-balm'],
    muscle:    ['pa-ortho-relief-oil', 'pa-pain-balm'],
    pain:      ['pa-ortho-secure', 'pa-ortho-relief-oil', 'pa-pain-balm'],
    acidity:   ['pa-taka-tak-powder', 'pa-triphala-churna'],
    gas:       ['pa-taka-tak-powder', 'pa-triphala-churna'],
    bloating:  ['pa-taka-tak-powder', 'pa-triphala-churna'],
    digestion: ['pa-arshas-cure', 'pa-taka-tak-powder', 'pa-triphala-churna'],
    constipation: ['pa-triphala-churna', 'pa-taka-tak-powder'],
    stress:    ['pa-ashwagandha-plus'],
    immunity:  ['pa-giloy-immunity', 'pa-moringa-capsule'],
    energy:    ['pa-ashwagandha-plus', 'pa-moringa-capsule'],
    hair:      ['pa-moringa-capsule'],
    skin:      ['pa-moringa-capsule'],
    piles:     ['pa-arshas-cure'],
    arshas:    ['pa-arshas-cure'],
    fever:     ['pa-giloy-immunity'],
    cough:     ['pa-giloy-immunity'],
    cold:      ['pa-giloy-immunity'],
    weight:    ['pa-triphala-churna'],
    sleep:     ['pa-ashwagandha-plus'],
    anaemia:   ['pa-moringa-capsule'],
    thyroid:   ['pa-ashwagandha-plus'],
    diabetes:  ['pa-triphala-churna', 'pa-giloy-immunity']
  };

  const SYMPTOM_KEYWORDS = Object.keys(SYMPTOM_MAP);

  // ── Language Detection (Feature 8) ──────────────────────────
  const LANG_PATTERNS = {
    hi: {
      keywords: ['नमस्ते','नमस्कार','दर्द','जोड़ों','कीमत','ऑर्डर','दवा','पेट','कब्ज','बाल','त्वचा','बुखार','खांसी','एसिडिटी','गैस','तनाव','नींद','थायराइड','डायबिटीज','एनीमिया'],
      greeting: 'नमस्ते! पद्मनाभ आयुर्वेदिक्स में आपका स्वागत है। मैं आपकी कैसे मदद कर सकता हूँ?',
      greetingName: 'नमस्ते {{name}}! आपका स्वागत है। आज आप क्या खोज रहे हैं?',
      checkout: 'कृपया अपना पूरा डिलीवरी पता दें:',
      payment: 'धन्यवाद। आप कैसे भुगतान करना चाहेंगे?',
      orderPlaced: '✅ ऑर्डर #{{id}} कन्फर्म! भुगतान: {{pay}}। पता: {{addr}}। अपडेट {{phone}} पर भेजेंगे। पद्मनाभ आयुर्वेदिक्स चुनने के लिए धन्यवाद! 🌿',
      consultConfirm: 'धन्यवाद! हमारे वैद्य आपकी जानकारी की समीक्षा करेंगे और 24 घंटे में {{phone}} पर संपर्क करेंगे।'
    },
    mr: {
      keywords: ['नमस्कार','दुख','दुखणे','किंमत','ऑर्डर','औषधी','पोट','बुखार','खोकला','सर्दी','केस','त्वचा','अॅसिडिटी','गॅस','तणाव','झोप'],
      greeting: 'नमस्कार! पद्मनाभ आयुर्वेदिक्समध्ये आपले स्वागत आहे. मी तुमची कशी मदत करू शकतो?',
      greetingName: 'नमस्कार {{name}}! तुमचे स्वागत आहे. आज तुम्ही काय शोधत आहात?',
    }
  };

  function detectLang(text) {
    for (const [lang, patterns] of Object.entries(LANG_PATTERNS)) {
      if (patterns.keywords.some(kw => text.includes(kw))) return lang;
    }
    return 'en';
  }

  function langStr(key, vars = {}) {
    const l = chatCtx.lang;
    if (l !== 'en' && LANG_PATTERNS[l] && LANG_PATTERNS[l][key]) {
      let s = LANG_PATTERNS[l][key];
      for (const [k, v] of Object.entries(vars)) s = s.replace('{{' + k + '}}', v);
      return s;
    }
    // English fallbacks
    const EN = {
      greeting: "Namaste! Welcome to Padmanabh Ayurvedics. I'm your wellness assistant. How can I help you today?",
      greetingName: "Namaste {{name}}! Great to see you again. What are you looking for today?",
      greetingLoggedIn: "Namaste {{name}}! Welcome back. You can browse products, track orders, or place a new order. What would you like?",
      checkout: "Please provide your full delivery address:",
      payment: "Thank you. How would you like to pay?",
      orderPlaced: "✅ Order #{{id}} confirmed! Payment: {{pay}}. Delivering to: {{addr}}. We'll send updates to {{phone}}. Thank you! 🌿",
      consultConfirm: "Thank you! Our Vaidya will review your details and contact you on {{phone}} within 24 hours.",
      consultFee: "Consultation is ₹199 (includes first follow-up). We'll contact you to complete payment.",
      orderFail: "Something went wrong with the order, but we've noted your interest. Our team will contact you.",
      help: "Here's what I can help with:",
    };
    if (EN[key]) {
      let s = EN[key];
      for (const [k, v] of Object.entries(vars)) s = s.replace('{{' + k + '}}', v);
      return s;
    }
    return key;
  }

  // ── Intent Classifier ──────────────────────────────────────
  const INTENT_PATTERNS = {
    greeting:     ['hi','hello','hey','namaste','नमस्ते','नमस्कार','good morning','good evening','hii','heyy'],
    help:         ['help','what can you do','options','menu','commands','सहायता','क्या कर सकते हैं'],
    symptom:      SYMPTOM_KEYWORDS,
    product_detail: ['tell me about','what is','details of','about','बताएं','क्या है','जानकारी'],
    price:        ['price','cost','how much','rate','कीमत','दाम','कितने का','कितने की','₹'],
    ingredients:  ['ingredients','contains','made of','सामग्री','क्या है इसमें','particles'],
    usage:        ['how to use','usage','how to take','उपयोग','कैसे लें','कैसे उपयोग'],
    order_track:  ['track','where is my order','order status','delivery status','shipping','awb','ट्रैक','ऑर्डर स्टेटस'],
    faq:          ['shipping time','return policy','refund','cod','delivery time','payment','रिटर्न','रिफंड','डिलीवरी'],
    consultation: ['consultation','consult','appointment','vaidya','doctor','talk to expert','परामर्श','डॉक्टर','वैद्य'],
    checkout:     ['checkout','place order','order now','complete order','buy now','ऑर्डर','खरीदें'],
    cart:         ['cart','my cart','whats in my cart','कार्ट']
  };

  function classifyIntent(text) {
    const lower = text.toLowerCase();
    for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
      for (const p of patterns) {
        if (lower.includes(p)) return intent;
      }
    }
    // Check if it looks like a product name match
    if (Store && Store.getCachedProducts) {
      const prods = Store.getCachedProducts();
      for (const p of prods) {
        if (lower.includes(p.name.toLowerCase()) ||
            lower.includes((p.nameHi || '').toLowerCase()) ||
            lower.includes((p.nameMr || '').toLowerCase())) {
          return 'product_select';
        }
      }
    }
    return null;
  }

  // ── FAQ Loader (Feature 5) ─────────────────────────────────
  async function loadFAQs() {
    try {
      if (window.getContentConfig) {
        const content = await getContentConfig();
        faqCache = content.faq || [];
      }
    } catch (e) { /* ignore */ }
    if (faqCache.length === 0) {
      faqCache = [
        { q: 'What is your shipping policy?', a: 'Free shipping on orders above ₹499. Standard delivery takes 3-7 business days across India.' },
        { q: 'Do you offer Cash on Delivery?', a: 'Yes, COD is available on all orders across India.' },
        { q: 'What is your return policy?', a: 'Returns accepted within 7 days of delivery for unopened, unused products.' },
        { q: 'How can I pay?', a: 'We accept UPI, Cards, Netbanking via Razorpay, and Cash on Delivery.' },
        { q: 'Do you ship internationally?', a: 'Currently we ship only within India.' },
        { q: 'How can I track my order?', a: 'Once shipped, you will receive an AWB number via SMS. You can also track it by asking me!' },
      ];
    }
  }

  function findFAQ(text) {
    const words = text.toLowerCase().split(/\s+/);
    let best = { faq: null, score: 0 };
    faqCache.forEach(faq => {
      const qWords = faq.q.toLowerCase().split(/\s+/);
      const match = words.filter(w => qWords.includes(w)).length;
      if (match > best.score) best = { faq, score: match };
    });
    return best.score >= 2 ? best.faq : null;
  }

  // ── Rich Card Builders (Feature 9) ─────────────────────────
  function buildProductCard(p) {
    if (!p) return '';
    const savings = Store.getSavings(p.price, p.mrp);
    const img = Store.convertDriveLink(p.images?.[0]);
    return `<div class="chat-product-card">
      <img src="${img}" alt="${p.name}" onerror="this.src='${FALLBACK_IMG}'">
      <div class="info">
        <div class="pname">${p.name}</div>
        <div class="pprice">
          <span class="current">₹${p.price}</span>
          ${p.mrp ? `<span class="old">₹${p.mrp}</span>` : ''}
          ${savings > 0 ? `<span class="badge">${savings}% OFF</span>` : ''}
        </div>
        <p class="pdesc">${p.description}</p>
        <div class="pactions">
          <button class="btn btn-primary btn-sm" onclick="chatAddToCart('${p.id}')" style="font-size:0.75rem;padding:4px 10px">Add to Cart</button>
          <button class="btn btn-outline btn-sm" onclick="chatShowDetail('${p.id}')" style="font-size:0.75rem;padding:4px 10px">Details</button>
        </div>
      </div>
    </div>`;
  }

  function buildOrderCard(o) {
    const st = o.status || 'pending';
    const sc = st === 'delivered' ? 'var(--success)' : st === 'shipped' ? 'var(--gold)' : st === 'processing' ? 'var(--warning)' : 'var(--text-muted)';
    return `<div class="chat-order-card">
      <div class="orow"><span class="oid">Order #${(o.id||'').slice(-6).toUpperCase()}</span><span style="color:${sc}">${st.toUpperCase()}</span></div>
      <div class="ometa">${o.items?.length||0} items · ₹${o.total} · ${o.createdAt ? new Date(o.createdAt).toLocaleDateString() : ''}</div>
      ${o.awb ? `<div class="oawb">AWB: ${o.awb}</div>` : ''}
    </div>`;
  }

  function buildDetailCard(p) {
    if (!p) return '';
    return `<div class="chat-detail-card">
      <div class="dtitle">${p.name}</div>
      <div class="dcat">${p.category}</div>
      <div class="drow"><span class="dlabel">Price</span><span class="dvalue">₹${p.price} ${p.mrp ? `<span style="text-decoration:line-through;color:var(--text-muted);font-weight:400">₹${p.mrp}</span>` : ''}</span></div>
      <div class="drow"><span class="dlabel">Description</span><span class="dvalue" style="font-weight:400">${p.description}</span></div>
      <div class="drow"><span class="dlabel">Ingredients</span><span class="dvalue" style="font-weight:400;font-size:0.8rem">${p.ingredients}</span></div>
      <div class="drow"><span class="dlabel">How to Use</span><span class="dvalue" style="font-weight:400;font-size:0.8rem">${p.usage}</span></div>
      <div style="margin-top:12px;display:flex;gap:6px">
        <button class="btn btn-primary btn-sm" onclick="chatAddToCart('${p.id}')" style="font-size:0.75rem">Add to Cart</button>
        <button class="btn btn-outline btn-sm" onclick="chatAddToCart('${p.id}')" style="font-size:0.75rem">Back</button>
      </div>
    </div>`;
  }

  // ── Global Chat Helpers ────────────────────────────────────
  window.chatAddToCart = function(productId) {
    const p = Store.getCachedProducts().find(x => x.id === productId);
    if (p) { Store.addToCart(p); showToast(`${p.name} added to cart`, 'success'); }
  };
  window.chatShowDetail = function(productId) {
    const p = Store.getCachedProducts().find(x => x.id === productId);
    if (p) {
      chatCtx.lastProduct = productId;
      chatCtx.lastProductName = p.name;
      chatCtx.lastTopic = 'detail';
      const card = buildDetailCard(p);
      const msg = document.createElement('div');
      msg.className = 'chat-msg bot';
      msg.innerHTML = card;
      chatBody.appendChild(msg);
      chatBody.scrollTop = chatBody.scrollHeight;
    }
  };
  window.handleChatOption = function(option) {
    if (chatInput) { chatInput.value = option; sendChatMessage(); }
  };

  // ── Append Helpers ─────────────────────────────────────────
  function appendBotMessage(text, options = []) {
    const msg = document.createElement('div');
    msg.className = 'chat-msg bot';
    let html = typeof text === 'string' ? text : '';
    if (options.length > 0) {
      html += `<div class="chat-options" style="margin-top:10px;display:flex;flex-direction:column;gap:6px;">`;
      options.forEach(o => {
        const safe = o.replace(/'/g, "\\'");
        html += `<button class="btn btn-outline btn-sm" onclick="handleChatOption('${safe}')" style="text-align:left;font-size:0.8rem;padding:6px 10px">${o}</button>`;
      });
      html += `</div>`;
    }
    msg.innerHTML = html;
    chatBody.appendChild(msg);
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  function appendLoader(text) {
    const msg = document.createElement('div');
    msg.className = 'chat-msg bot';
    msg.textContent = text;
    chatBody.appendChild(msg);
    chatBody.scrollTop = chatBody.scrollHeight;
    return msg;
  }

  function removeLoaders() {
    chatBody.querySelectorAll('.chat-msg.bot').forEach(m => {
      if (m.textContent.includes('...') || m.textContent.includes('🔍') || m.textContent.includes('🔐') || m.textContent.includes('🌿')) m.remove();
    });
  }

  function getDynamicButtons(max = 6) {
    return Store.getCachedProducts().slice(0, max).map(p => p.name);
  }

  // ── Proactive Idle Timer (Feature 7) ───────────────────────
  function resetIdleTimer() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (chatWindow.classList.contains('open') && chatCtx.flow !== 'checkout') {
        appendBotMessage("Still thinking? 😊 Feel free to ask me anything — product recommendations, order tracking, or place an order!", [
          'Show Products', 'Track My Order', 'Consultation'
        ]);
      }
    }, 30000);
  }

  // ── Intent Handlers ────────────────────────────────────────

  // Handle symptom → product recommendations (Feature 2)
  function handleSymptom(text, symptomKeyword) {
    const ids = SYMPTOM_MAP[symptomKeyword];
    if (!ids) return false;
    
    // Find products using direct ID or fuzzy name matching to bridge sample vs real DB IDs
    const prods = ids.map(id => {
      const cached = Store.getCachedProducts();
      let found = cached.find(p => p.id === id);
      if (found) return found;

      const cleanId = id.replace(/^pa-/, '');
      const idWords = cleanId.split('-').filter(w => !['capsule', 'capsules', 'powder', 'oil', 'balm', 'cure', 'plus', 'relief'].includes(w));
      
      return cached.find(p => {
        const nameLower = p.name.toLowerCase();
        const idLower = p.id.toLowerCase();
        if (idLower.includes(cleanId) || cleanId.includes(idLower)) return true;
        return idWords.some(word => nameLower.includes(word));
      });
    }).filter(Boolean);

    if (prods.length === 0) return false;

    chatCtx.lastIntent = 'symptom';
    chatCtx.lastTopic = 'recommendation';

    let msg = `Based on what you described, here are some products that may help:`;
    appendBotMessage(msg);
    prods.forEach(p => {
      const card = buildProductCard(p);
      const el = document.createElement('div');
      el.className = 'chat-msg bot';
      el.innerHTML = card;
      chatBody.appendChild(el);
    });
    appendBotMessage("Would you like more details on any of these, or shall I add them to your cart?", [
      'Tell me more', 'Add all to cart', 'Browse other products'
    ]);
    chatBody.scrollTop = chatBody.scrollHeight;
    return true;
  }

  // Handle order tracking (Feature 4)
  async function handleOrderTrack() {
    const session = PhoneAuth.getUser();
    if (!session) {
      appendBotMessage("Please login first so I can look up your orders. You can login via the checkout page.");
      return;
    }
    appendLoader("Looking up your orders...");
    let orders = [];
    try { orders = JSON.parse(localStorage.getItem('pa_orders') || '[]'); } catch(e) {}
    orders = orders.filter(o => o.customerPhone === session.phone)
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    removeLoaders();
    if (orders.length === 0) {
      appendBotMessage("No orders found for your account. Would you like to browse our products?", ['Browse Products']);
      return;
    }
    appendBotMessage(`Found ${orders.length} order(s). Here are your latest:`);
    orders.slice(0, 3).forEach(o => {
      const card = buildOrderCard(o);
      const el = document.createElement('div');
      el.className = 'chat-msg bot';
      el.innerHTML = card;
      chatBody.appendChild(el);
    });
    if (orders[0].awb) {
      appendBotMessage(`Your latest order AWB: ${orders[0].awb}. Track it now?`, ['Track Now', 'Back']);
    } else {
      appendBotMessage("Your order is being processed. You'll receive tracking details soon.", ['Back']);
    }
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  async function handleTrackAWB(awb) {
    appendLoader("Fetching tracking...");
    try {
      if (window.ShiprocketHelper) {
        const res = await ShiprocketHelper.trackShipment(awb);
        const data = res.tracking_data || {};
        const activities = data?.shipment_track_activities || [];
        removeLoaders();
        if (activities.length > 0) {
          let html = '<div class="chat-tracking-timeline">';
          activities.forEach(a => {
            html += `<div class="titem"><div class="tdate">${a.date || ''}</div><div class="tact">${a.activity || ''}</div><div class="tloc">${a.location || ''}</div></div>`;
          });
          html += '</div>';
          const el = document.createElement('div');
          el.className = 'chat-msg bot';
          el.innerHTML = html;
          chatBody.appendChild(el);
        } else {
          appendBotMessage("No tracking updates available yet.");
        }
      } else {
        removeLoaders();
        appendBotMessage("Tracking service not available right now.");
      }
    } catch (e) {
      removeLoaders();
      appendBotMessage("Could not fetch tracking details. Please try again later.");
    }
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  async function handlePincodeCheck(pincode) {
    appendLoader("Checking courier options...");
    try {
      if (window.Shiprocket) {
        let couriers = [];
        try {
          couriers = await Shiprocket.checkServiceability(null, pincode);
        } catch(apiError) {
          console.warn("ShipRocket API failed (likely running locally). Using mock data.", apiError);
          couriers = [
            { courier_name: 'Delhivery', estimated_delivery_days: 3, rate: 60 },
            { courier_name: 'XpressBees', estimated_delivery_days: 4, rate: 55 },
            { courier_name: 'Ecom Express', estimated_delivery_days: 5, rate: 50 }
          ];
        }
        removeLoaders();
        if (couriers && couriers.length > 0) {
          let html = `Good news! We deliver to ${pincode}. Courier options:<br><ul style="margin: 5px 0; padding-left: 20px; font-size: 0.9em;">`;
          couriers.slice(0, 5).forEach(c => {
            html += `<li>${c.courier_name} (Est: ${c.estimated_delivery_days || c.etd} days, ₹${c.rate})</li>`;
          });
          html += '</ul>';
          appendBotMessage(html, ['Checkout', 'Browse Products']);
        } else {
          appendBotMessage(`Sorry, we currently do not have serviceability to ${pincode}.`, ['Help']);
        }
      } else {
        removeLoaders();
        appendBotMessage("Serviceability check is currently unavailable.");
      }
    } catch (e) {
      removeLoaders();
      appendBotMessage("Could not fetch courier options. Please try again later.");
    }
  }

  // Handle FAQ (Feature 5)
  function handleFAQ(text) {
    const faq = findFAQ(text);
    if (!faq) return false;
    appendBotMessage(faq.a, ['Got it, thanks', 'Ask another question']);
    return true;
  }

  // Handle product detail/price/ingredients context-aware (Feature 3)
  function handleProductContext(intent, text) {
    if (!chatCtx.lastProduct) {
      // No context — show product list
      appendBotMessage("Which product would you like to know about?", getDynamicButtons(6));
      return true;
    }
    const p = Store.getCachedProducts().find(x => x.id === chatCtx.lastProduct);
    if (!p) return false;

    if (intent === 'price') {
      const savings = Store.getSavings(p.price, p.mrp);
      appendBotMessage(`${p.name} is ₹${p.price}${p.mrp ? `, MRP ₹${p.mrp}` : ''}${savings > 0 ? ` — you save ${savings}%!` : ''}. Want to add it to your cart?`, ['Add to Cart', 'Show Details']);
    } else if (intent === 'ingredients') {
      appendBotMessage(`**${p.name} — Ingredients:**\n${p.ingredients}`, ['Add to Cart', 'How to use']);
    } else if (intent === 'usage') {
      appendBotMessage(`**${p.name} — How to Use:**\n${p.usage}`, ['Add to Cart', 'Show Ingredients']);
    } else if (intent === 'product_detail') {
      chatCtx.lastTopic = 'detail';
      const card = buildDetailCard(p);
      const el = document.createElement('div');
      el.className = 'chat-msg bot';
      el.innerHTML = card;
      chatBody.appendChild(el);
    }
    chatBody.scrollTop = chatBody.scrollHeight;
    return true;
  }

  // Handle product selection (when user types a product name)
  function handleProductSelect(text) {
    const prods = Store.getCachedProducts();
    const p = prods.find(x =>
      text.toLowerCase().includes(x.name.toLowerCase()) ||
      (x.nameHi && text.includes(x.nameHi)) ||
      (x.nameMr && text.includes(x.nameMr))
    );
    if (!p) return false;
    chatCtx.lastProduct = p.id;
    chatCtx.lastProductName = p.name;
    chatCtx.lastTopic = 'detail';
    const savings = Store.getSavings(p.price, p.mrp);
    appendBotMessage(`${p.name} — ₹${p.price}${p.mrp ? ` (MRP ₹${p.mrp})` : ''}${savings > 0 ? ` — ${savings}% OFF!` : ''}\n${p.description}`, [
      'Add to Cart', 'Tell me more', 'Ingredients', 'How to use'
    ]);
    return true;
  }

  // Handle consultation with qualification (Feature 10)
  function handleConsultation() {
    if (!chatCtx.user.isLoggedIn) {
      appendBotMessage("I'd love to connect you with our Ayurvedic expert! First, I'll need your details.", ['Start Registration']);
      return;
    }
    chatCtx.flow = 'consultation';
    chatCtx.consult = { symptoms: '', duration: '', priorTreatment: '', age: '', preferredTime: '' };
    chatCtx.flowStep = 0;
    appendBotMessage("I'll connect you with our Ayurvedic expert. A few quick details to help them prepare:");
    askConsultQuestion();
  }

  const CONSULT_QUESTIONS = [
    { key: 'symptoms', q: '1/5 — What symptoms or health concerns are you facing?' },
    { key: 'duration', q: '2/5 — How long have you been experiencing this?' },
    { key: 'priorTreatment', q: '3/5 — Have you tried any treatments before?' },
    { key: 'age', q: '4/5 — What is your age?' },
    { key: 'preferredTime', q: '5/5 — When would you prefer the consultation?' }
  ];

  function askConsultQuestion() {
    if (chatCtx.flowStep < CONSULT_QUESTIONS.length) {
      appendBotMessage(CONSULT_QUESTIONS[chatCtx.flowStep].q);
    } else {
      finishConsultation();
    }
  }

  async function finishConsultation() {
    appendLoader("Submitting your consultation request...");
    const data = {
      name: chatCtx.user.name,
      phone: chatCtx.user.phone,
      service: 'Consultation',
      ...chatCtx.consult,
      timestamp: new Date().toISOString()
    };
    try {
      if (window.saveLead) await saveLead(data);
      else {
        const leads = JSON.parse(localStorage.getItem('pa_leads') || '[]');
        leads.unshift(data);
        localStorage.setItem('pa_leads', JSON.stringify(leads));
      }
    } catch (e) { /* silent */ }
    removeLoaders();
    chatCtx.flow = null;
    appendBotMessage(langStr('consultConfirm', { phone: chatCtx.user.phone }) + ' ' + langStr('consultFee'), ['Got it, thanks', 'Browse Products']);
  }

  // ── Greeting with dynamic buttons (Feature 6) ──────────────
  function handleGreeting() {
    const session = PhoneAuth.getUser();
    const prods = getDynamicButtons(4);
    const btns = [...prods, 'Track My Order', 'Consultation'];
    if (session && session.phone) {
      chatCtx.user = { name: session.name || session.phone, phone: session.phone, uid: session.uid, isLoggedIn: true };
      appendBotMessage(langStr('greetingLoggedIn', { name: session.name || session.phone }), btns);
    } else {
      appendBotMessage(langStr('greeting'), btns);
    }
    // Check for cart abandonment (Feature 7)
    if (Store.getCartCount() > 0) {
      setTimeout(() => {
        appendBotMessage(`I see you have ${Store.getCartCount()} item(s) in your cart (₹${Store.getCartTotal()}). Would you like to complete your order?`, ['Complete Order', 'Continue Shopping']);
      }, 1500);
    }
  }

  // ── Help menu ──────────────────────────────────────────────
  function handleHelp() {
    appendBotMessage(langStr('help') + `
🌿 Ask about health concerns (joint pain, digestion, etc.)
📦 Track your orders
💬 Learn about products, prices, ingredients
❓ FAQ about shipping, returns, payment
🛒 Place an order
👨‍⚕️ Book a consultation with our Vaidya`, [
      'I have a health concern', 'Track My Order', 'Show Products', 'Consultation'
    ]);
  }

  // ── Main Message Handler ───────────────────────────────────
  function sendChatMessage() {
    const text = chatInput.value.trim();
    if (!text) return;
    const userMsg = document.createElement('div');
    userMsg.className = 'chat-msg user';
    userMsg.textContent = text;
    chatBody.appendChild(userMsg);
    chatInput.value = '';
    chatBody.scrollTop = chatBody.scrollHeight;
    resetIdleTimer();

    // Store context
    chatCtx.conversation.push({ role: 'user', text });
    if (chatCtx.conversation.length > 10) chatCtx.conversation.shift();

    // Detect language
    chatCtx.lang = detectLang(text);

    setTimeout(async () => {
      // ── Flow-based handlers first ──
      if (chatCtx.flow === 'consultation') {
        const step = chatCtx.flowStep;
        if (step < CONSULT_QUESTIONS.length) {
          chatCtx.consult[CONSULT_QUESTIONS[step].key] = text;
          chatCtx.flowStep++;
          askConsultQuestion();
        } else {
          finishConsultation();
        }
        chatBody.scrollTop = chatBody.scrollHeight;
        return;
      }

      if (chatCtx.flow === 'lead_capture') {
        const step = chatCtx.flowStep;
        if (step === 0) {
          chatCtx.user.name = text;
          chatCtx.flowStep = 1;
          askLeadQuestion();
        } else if (step === 1) {
          chatCtx.user.phone = text;
          appendLoader("Verifying...");
          try {
            const existingUser = window.getUserByPhone ? await window.getUserByPhone(text) : null;
            removeLoaders();
            if (!existingUser) {
              chatCtx.flowStep = 2;
              chatCtx.isNewUser = true;
              appendBotMessage("It looks like you're new here! Please set a password to create your account.");
            } else {
              chatCtx.flowStep = 2;
              chatCtx.isNewUser = false;
              appendBotMessage("Welcome back! Please enter your password to login.");
            }
          } catch(e) {
             removeLoaders();
             finishLeadCapture();
          }
        } else if (step === 2) {
          const password = text;
          appendLoader(chatCtx.isNewUser ? "Creating account..." : "Logging in...");
          try {
             if (chatCtx.isNewUser) {
               await PhoneAuth.register(chatCtx.user.phone, chatCtx.user.name, password);
             } else {
               await PhoneAuth.login(chatCtx.user.phone, password);
             }
             removeLoaders();
             appendBotMessage(chatCtx.isNewUser ? "Account created successfully! 🎉" : "Logged in successfully! 🔓");
             finishLeadCapture();
          } catch (err) {
             removeLoaders();
             appendBotMessage(err.message || "Invalid password. Try again.");
          }
        }
        chatBody.scrollTop = chatBody.scrollHeight;
        return;
      }

      if (chatCtx.flow === 'checkout') {
        // Existing checkout flow states
        if (chatCtx.flowStep === 'ASK_ADDRESS') {
          chatCtx.checkoutAddress = text;
          chatCtx.flowStep = 'ASK_PAYMENT';
          appendBotMessage(langStr('payment'), ['Cash on Delivery (COD)', 'Online Payment (Razorpay)']);
        } else if (chatCtx.flowStep === 'ASK_PAYMENT') {
          await placeChatbotOrder(text);
        }
        chatBody.scrollTop = chatBody.scrollHeight;
        return;
      }

      // ── Check if it's a known flow option ──
      if (text === 'Consultation' || text === 'Consultation / Ayurvedic Therapy') {
        handleConsultation(); return;
      }
      if (text === 'Show Products' || text === 'Browse Products' || text === 'Browse other products') {
        appendBotMessage("Here are our products:", getDynamicButtons(8)); return;
      }
      if (text === 'Tell me more' && chatCtx.lastProduct) {
        const p = Store.getCachedProducts().find(x => x.id === chatCtx.lastProduct);
        if (p) { chatCtx.lastTopic = 'detail'; const card = buildDetailCard(p); const el = document.createElement('div'); el.className = 'chat-msg bot'; el.innerHTML = card; chatBody.appendChild(el); chatBody.scrollTop = chatBody.scrollHeight; }
        return;
      }
      if (text === 'Ingredients' && chatCtx.lastProduct) {
        handleProductContext('ingredients', text); return;
      }
      if (text === 'How to use' && chatCtx.lastProduct) {
        handleProductContext('usage', text); return;
      }
      if (text === 'Add to Cart' && chatCtx.lastProduct) {
        const p = Store.getCachedProducts().find(x => x.id === chatCtx.lastProduct);
        if (p) { Store.addToCart(p); appendBotMessage(`${p.name} added to cart!`, ['Checkout', 'Keep Shopping']); }
        return;
      }
      if (text === 'Add all to cart') {
        // Find all recommended products
        let count = 0;
        chatBody.querySelectorAll('.chat-product-card').forEach(card => {
          const btn = card.querySelector('[onclick^="chatAddToCart"]');
          if (btn) {
            const match = btn.getAttribute('onclick').match(/'([^']+)'/);
            if (match) { const p = Store.getCachedProducts().find(x => x.id === match[1]); if (p) { Store.addToCart(p); count++; } }
          }
        });
        appendBotMessage(`${count} product(s) added to cart!`, ['Checkout', 'Keep Shopping']);
        return;
      }
      if (text === 'Checkout' || text === 'Complete Order' || text === 'place order') {
        startCheckoutFlow(); return;
      }
      if (text === 'Track Now' || text === 'Track My Order') {
        handleOrderTrack(); return;
      }
      if (text === 'Back') {
        appendBotMessage("What would you like to do?", ['Show Products', 'Track My Order', 'Consultation', 'Help']); return;
      }
      if (text === 'Got it, thanks' || text === 'No, thanks' || text === 'Keep Shopping') {
        appendBotMessage("Glad I could help! 😊 Anything else?", ['Show Products', 'Track My Order', 'Help']); return;
      }
      if (text === 'Add all to cart') {
        let count = 0;
        Store.getCachedProducts().forEach(p => { Store.addToCart(p); count++; });
        appendBotMessage(`${count} products added to cart!`, ['Checkout']); return;
      }
      if (text === 'Start Registration') {
        startCheckoutFlow(); return;
      }
      if (text === 'Help') { handleHelp(); return; }

      // ── Intent classification ──
      const intent = classifyIntent(text);

      if (intent === 'greeting') { handleGreeting(); return; }
      if (intent === 'help') { handleHelp(); return; }
      if (intent === 'symptom') {
        for (const kw of SYMPTOM_KEYWORDS) {
          if (text.toLowerCase().includes(kw)) {
            if (handleSymptom(text, kw)) return;
          }
        }
      }
      if (intent === 'order_track') { handleOrderTrack(); return; }
      if (intent === 'faq') { if (handleFAQ(text)) return; }
      if (intent === 'consultation') { handleConsultation(); return; }
      if (intent === 'checkout') { startCheckoutFlow(); return; }
      if (intent === 'cart') {
        const cart = Store.getCart();
        if (cart.length === 0) { appendBotMessage("Your cart is empty.", ['Browse Products']); return; }
        let html = `You have ${cart.length} item(s) in your cart (₹${Store.getCartTotal()}):<br>`;
        cart.forEach(i => { html += `• ${i.name} x${i.qty} — ₹${i.price * i.qty}<br>`; });
        appendBotMessage(html, ['Checkout', 'Continue Shopping']);
        return;
      }
      if (intent === 'product_select') { if (handleProductSelect(text)) return; }
      if (intent === 'product_detail' || intent === 'price' || intent === 'ingredients' || intent === 'usage') {
        if (handleProductContext(intent, text)) return;
      }
      
      if (intent === 'pincode') {
        appendBotMessage("Please enter your 6-digit Pincode to check courier options.");
        return;
      }

      // ── Check if it looks like a Pincode (6 digits) ──
      if (/^\d{6}$/.test(text.trim())) {
        await handlePincodeCheck(text.trim());
        return;
      }

      // ── Check if it looks like an AWB number ──
      if (/^[A-Z0-9]{5,20}$/i.test(text.trim())) {
        await handleTrackAWB(text.trim());
        return;
      }

      // ── Fallback: show quick replies ──
      const btns = getDynamicButtons(4);
      appendBotMessage("I'm not sure I understand. Try one of these:", [...btns, 'Help']);

    }, 600);
  }

  // ── Checkout Flow ──────────────────────────────────────────
  function startCheckoutFlow() {
    const cart = Store.getCart();
    if (cart.length === 0) {
      appendBotMessage("Your cart is empty. Let's add some products first!", ['Browse Products']);
      return;
    }
    const session = PhoneAuth.getUser();
    if (!session || !session.phone) {
      appendBotMessage("Please login or create an account to place an order.");
      return;
    }
    chatCtx.user = { name: session.name || session.phone, phone: session.phone, uid: session.uid, isLoggedIn: true };
    chatCtx.user.name = session.name || session.phone;
    chatCtx.user.phone = session.phone;
    chatCtx.user.uid = session.uid;

    chatCtx.flow = 'checkout';
    chatCtx.flowStep = 'ASK_ADDRESS';
    chatCtx.checkoutAddress = '';
    let items = cart.map(i => `${i.name} x${i.qty} — ₹${i.price * i.qty}`).join('\n');
    appendBotMessage(`Your order:\n${items}\nTotal: ₹${Store.getCartTotal()}\n\n` + langStr('checkout'));
  }

  async function placeChatbotOrder(paymentText) {
    appendLoader("Placing your order...");
    const cart = Store.getCart();
    const cartTotal = Store.getCartTotal();
    const shipping = cartTotal >= 499 ? 0 : 60;
    const total = cartTotal + shipping;
    const isCOD = paymentText.toLowerCase().includes('cod');

    const orderData = {
      customerName: chatCtx.user.name,
      customerPhone: chatCtx.user.phone,
      address: { address: chatCtx.checkoutAddress, city: '', pincode: '', state: '', name: chatCtx.user.name, phone: chatCtx.user.phone },
      paymentMethod: isCOD ? 'COD' : 'Online',
      items: cart.length > 0 ? cart : [{ name: 'Chatbot Order', qty: 1, price: total, productId: 'CHAT' }],
      subtotal: cartTotal,
      shipping,
      total,
      userId: chatCtx.user.uid || chatCtx.user.phone
    };

    try {
      let orderId = 'ORD' + Date.now().toString().slice(-6);
      if (window.createOrder) orderId = await createOrder(orderData);
      if (window.linkOrderToUser) await linkOrderToUser(chatCtx.user.phone, orderId);

      const localOrder = { id: orderId, userId: orderData.userId, customerName: chatCtx.user.name, customerPhone: chatCtx.user.phone, email: chatCtx.user.phone + '@padmanabh.site', address: orderData.address, items: orderData.items, subtotal: orderData.subtotal, shipping, tax: 0, total, payment: isCOD ? 'COD' : 'Online', paymentId: isCOD ? 'COD_' + Date.now() : 'Razorpay_' + Date.now(), status: 'pending', courierCompany: 'Standard Shipping', courierCharge: shipping, createdAt: new Date().toISOString(), srStatus: null, trackingId: null, awb: null, srOrderId: null, shipmentId: null };
      const localOrders = JSON.parse(localStorage.getItem('pa_orders') || '[]');
      localOrders.push(localOrder);
      localStorage.setItem('pa_orders', JSON.stringify(localOrders));
      Store.clearCart();

      removeLoaders();
      chatCtx.flow = null;
      appendBotMessage(langStr('orderPlaced', { id: orderId.slice(-6).toUpperCase(), pay: isCOD ? 'COD' : 'Online', addr: chatCtx.checkoutAddress, phone: chatCtx.user.phone }), ['Track My Order', 'Shop More']);
    } catch (e) {
      removeLoaders();
      appendBotMessage(langStr('orderFail'));
    }
  }

  // ── Lead Capture Questionnaire (Chatbot) ───────────────────
  const LEAD_QUESTIONS = [
    { key: 'name', q: 'Hello! 👋 Before we start, may I know your name?' },
    { key: 'phone', q: 'Thanks! What is your phone number so our experts can reach you if we get disconnected?' }
  ];

  function startLeadCaptureFlow() {
    chatCtx.flow = 'lead_capture';
    chatCtx.flowStep = 0;
    askLeadQuestion();
  }

  function askLeadQuestion() {
    if (chatCtx.flowStep < LEAD_QUESTIONS.length) {
      appendBotMessage(LEAD_QUESTIONS[chatCtx.flowStep].q);
    } else {
      finishLeadCapture();
    }
  }

  async function finishLeadCapture() {
    try {
      const data = {
        name: chatCtx.user.name,
        phone: chatCtx.user.phone,
        service: 'Chatbot Lead',
        timestamp: new Date().toISOString()
      };
      if (window.saveLead) {
        await saveLead(data);
      } else {
        let leads = [];
        try { leads = JSON.parse(localStorage.getItem('pa_leads') || '[]'); } catch(e){}
        leads.unshift(data);
        localStorage.setItem('pa_leads', JSON.stringify(leads));
      }
    } catch (e) {
      console.error('Lead capture error', e);
    }
    chatCtx.flow = null;
    handleGreeting();
    if (window._lastProductPage) {
      const p = Store.getCachedProducts().find(x => x.id === window._lastProductPage);
      if (p) {
        chatCtx.lastProduct = p.id;
        setTimeout(() => {
          appendBotMessage(`I see you're looking at ${p.name} (₹${p.price}). Would you like to know more?`, ['Show Details', 'Add to Cart']);
        }, 2000);
      }
    }
  }

  // ── Chat Toggle ────────────────────────────────────────────
  function toggleChat() {
    chatWindow.classList.toggle('open');
    if (chatWindow.classList.contains('open')) {
      chatInput.focus();
      if (!chatCtx._initialized) {
        chatCtx._initialized = true;
        chatBody.innerHTML = '';
        loadFAQs();
        const session = PhoneAuth.getUser();
        if (session && session.phone) {
          chatCtx.user = { name: session.name || session.phone, phone: session.phone, uid: session.uid, isLoggedIn: true };
        } else {
          try {
            const leads = JSON.parse(localStorage.getItem('pa_leads') || '[]');
            if (leads.length > 0) { chatCtx.user.name = leads[0].name; chatCtx.user.phone = leads[0].phone; }
          } catch(e) {}
        }
        
        if (!chatCtx.user.phone) {
          startLeadCaptureFlow();
        } else {
          handleGreeting();
          // Check product page context (Feature 7)
          if (window._lastProductPage) {
            const p = Store.getCachedProducts().find(x => x.id === window._lastProductPage);
            if (p) {
              chatCtx.lastProduct = p.id;
              setTimeout(() => {
                appendBotMessage(`I see you're looking at ${p.name} (₹${p.price}). Would you like to know more?`, ['Show Details', 'Add to Cart']);
              }, 2000);
            }
          }
        }
      }
    }
  }

  // ── Event Listeners ────────────────────────────────────────
  if (chatBtn) chatBtn.addEventListener('click', toggleChat);
  if (chatClose) chatClose.addEventListener('click', toggleChat);
  if (chatSend) chatSend.addEventListener('click', sendChatMessage);
  if (chatInput) {
    chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { sendChatMessage(); resetIdleTimer(); } });
  }

  // ── Track product page for proactive context (Feature 7) ───
  const origInitProduct = window.initProduct || function(){};
  const origNav = window.navigate;
  window._lastProductPage = null;
  document.addEventListener('page:product', (e) => {
    window._lastProductPage = e.detail?.id || null;
  });

// Update Navbar UI based on Auth state
window.updateAuthUI = async function() {
  const session = PhoneAuth.getUser();
  const navDashBtn = document.querySelector('[data-i18n="nav.dashboard"]');
  const mobileDashBtn = document.querySelector('#mobile-nav [data-i18n="nav.dashboard"]');

  if (session && session.phone) {
    const label = session.name || session.phone;
    if (navDashBtn) {
      navDashBtn.innerHTML = `<span style="display:flex;align-items:center;gap:6px">👤 Hi, ${label}</span>`;
      navDashBtn.classList.add('logged-in');
    }
    if (mobileDashBtn) {
      mobileDashBtn.innerHTML = `👤 Hi, ${label}`;
      mobileDashBtn.classList.add('logged-in');
    }
  } else {
    if (navDashBtn) {
      navDashBtn.textContent = 'Login / Register';
      navDashBtn.classList.remove('logged-in');
    }
    if (mobileDashBtn) {
      mobileDashBtn.textContent = 'Login / Register';
      mobileDashBtn.classList.remove('logged-in');
    }
  }
}

    if (chatSend) chatSend.addEventListener('click', sendChatMessage);
    if (chatInput) {
      chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendChatMessage();
      });
    }
  });

// ── SIDE CART DRAWER ──────────────────────────────────────────
window.openCartDrawer = function() {
  const overlay = document.getElementById('cart-drawer-overlay');
  const drawer  = document.getElementById('cart-drawer');
  if (!overlay || !drawer) return;
  overlay.classList.add('active');
  drawer.classList.add('open');
  renderCartDrawer();
};

window.closeCartDrawer = function() {
  const overlay = document.getElementById('cart-drawer-overlay');
  const drawer  = document.getElementById('cart-drawer');
  if (overlay) overlay.classList.remove('active');
  if (drawer)  drawer.classList.remove('open');
};

function renderCartDrawer() {
  const itemsEl    = document.getElementById('cart-drawer-items');
  const footerEl   = document.getElementById('cart-drawer-footer');
  const subtotalEl = document.getElementById('cart-drawer-subtotal');
  if (!itemsEl) return;

  const cart = Store.getCart();
  const lang = localStorage.getItem('pa_lang') || 'en';

  if (cart.length === 0) {
    itemsEl.innerHTML = `
      <div style="text-align:center;padding:60px 20px;color:var(--text-muted)">
        <div style="font-size:3rem;margin-bottom:16px;opacity:0.4">🛒</div>
        <p style="margin-bottom:16px">Your cart is empty</p>
        <button class="btn btn-outline btn-sm" onclick="closeCartDrawer();navigate('catalog')">Browse Products</button>
      </div>`;
    if (footerEl) footerEl.style.display = 'none';
    return;
  }

  itemsEl.innerHTML = cart.map(item => {
    const name = lang === 'hi' ? (item.nameHi || item.name) : lang === 'mr' ? (item.nameMr || item.name) : item.name;
    return `
    <div class="side-cart-item">
      <div class="side-cart-item-img">
        <img src="${Store.convertDriveLink(item.image)}" alt="${name}" loading="lazy"/>
      </div>
      <div class="side-cart-item-info">
        <div class="side-cart-item-name">${name}</div>
        <div class="side-cart-item-price">${Store.formatPrice(item.price)}</div>
        <div class="qty-control" style="margin-top:6px;transform:scale(0.85);transform-origin:left">
          <button class="qty-btn" onclick="Store.updateQty('${item.id}', ${item.qty - 1});renderCartDrawer()">−</button>
          <span class="qty-value">${item.qty}</span>
          <button class="qty-btn" onclick="Store.updateQty('${item.id}', ${item.qty + 1});renderCartDrawer()">+</button>
        </div>
      </div>
      <div class="side-cart-item-right">
        <div class="side-cart-item-total">${Store.formatPrice(item.price * item.qty)}</div>
        <button onclick="Store.removeFromCart('${item.id}');renderCartDrawer()" class="side-cart-remove" title="Remove">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>`;
  }).join('');

  const subtotal = Store.getCartTotal();
  if (subtotalEl) subtotalEl.textContent = Store.formatPrice(subtotal);
  if (footerEl)   footerEl.style.display = 'block';
}

// Cart drawer overlay click to close
document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('cart-drawer-overlay');
  if (overlay) overlay.addEventListener('click', closeCartDrawer);
  const closeBtn = document.getElementById('cart-drawer-close');
  if (closeBtn) closeBtn.addEventListener('click', closeCartDrawer);
});

// Re-render if cart updates while drawer is open
document.addEventListener('cart:updated', () => {
  const drawer = document.getElementById('cart-drawer');
  if (drawer && drawer.classList.contains('open')) renderCartDrawer();
});

// ── USER PROFILE DRAWER ───────────────────────────────────────
window.openUserDrawer = async function() {
  const overlay = document.getElementById('user-drawer-overlay');
  const drawer = document.getElementById('user-drawer');
  const body = document.getElementById('user-drawer-body');
  
  overlay.classList.add('active');
  drawer.classList.add('open');
  body.innerHTML = `<div class="text-center" style="padding:40px;"><div class="spinner" style="border-top-color:var(--gold);width:30px;height:30px;border-width:3px;margin:0 auto;"></div><p style="margin-top:16px;color:var(--text-muted)">Loading Profile...</p></div>`;

  const session = PhoneAuth.getUser();

  if (!session || !session.phone) {
    body.innerHTML = `
      <div style="text-align:center; padding: 60px 20px;">
        <div style="font-size:3.5rem; margin-bottom:24px;">🔐</div>
        <h3 style="font-family:var(--font-serif); margin-bottom:12px;">Login Required</h3>
        <p style="color:var(--text-muted); margin-bottom:32px; line-height:1.6;">Sign in to view your orders, track shipments, and manage your profile.</p>
        <p style="margin-bottom:16px; font-size:0.85rem; color:var(--text-secondary)">Use your phone number and password to login.</p>
        <button class="btn btn-primary btn-full" onclick="closeUserDrawer(); showPhoneAuthModal();" style="margin-bottom:12px;">
          Login to Continue
        </button>
      </div>
    `;
    return;
  }

  const phone = session.phone;
  const name = session.name || phone;

  let orders = [];
  // Fallback to localStorage
  try { orders = JSON.parse(localStorage.getItem('pa_orders') || '[]'); } catch(e) {}

  // Fetch from Firestore to get latest status (including Admin Acceptances)
  if (typeof window.getAdminOrders === 'function') {
    const fsOrders = await window.getAdminOrders();
    if (fsOrders && fsOrders.length > 0) {
      orders = fsOrders;
      // Sync back to local storage
      try { localStorage.setItem('pa_orders', JSON.stringify(orders)); } catch(e) {}
    }
  }

  const normPhone = phone.replace(/\D/g, '').slice(-10);
  orders = orders.filter(o => {
    const oPhone = String(o.phone || o.customerPhone || '').replace(/\D/g, '').slice(-10);
    return o.userId === session.uid || oPhone === normPhone;
  });

  
  window._currentUserOrders = orders;

  let ordersHtml = `
    <div style="text-align:center; padding: 40px 20px;">
      <div style="font-size:3rem; margin-bottom:16px; opacity:0.3;">📦</div>
      <p style="color:var(--text-muted); margin-bottom:16px;">No orders placed yet.</p>
      <button class="btn btn-primary" onclick="navigate('catalog'); closeUserDrawer();">Start Shopping</button>
    </div>
  `;

  if (orders.length > 0) {
    ordersHtml = orders.map(o => {
      const d = o.createdAt ? new Date(o.createdAt).toLocaleDateString() : 'Just now';
      let statusClass = 'pill-muted';
      if (o.status === 'processing') statusClass = 'pill-warning';
      if (o.status === 'shipped')    statusClass = 'pill-gold';
      if (o.status === 'delivered')  statusClass = 'pill-success';
      
      return `
        <div class="order-card" style="background:var(--bg-elevated); border:1px solid var(--border); border-radius:var(--radius-md); padding:16px; margin-bottom:16px; transition:transform 0.2s ease;" onmouseenter="this.style.transform='translateY(-2px)'" onmouseleave="this.style.transform='translateY(0)'">
          <div style="display:flex; justify-content:space-between; margin-bottom:12px;">
            <span style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px;">${d}</span>
            <span class="pill ${statusClass}" style="font-size:0.7rem;">${(o.status || 'pending').toUpperCase()}</span>
          </div>
          <div style="font-weight:600; font-size:1rem; margin-bottom:4px;">Order #${o.id.slice(-6).toUpperCase()}</div>
          <div style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:12px;">${o.items?.length || 0} Items · Total: ₹${o.total}</div>
          
          <div style="background:rgba(0,0,0,0.2); padding:8px 12px; border-radius:4px; margin-bottom:16px; font-size:0.8rem;">
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
              <span style="color:var(--text-muted)">Payment</span>
              <span style="color:var(--text-primary)">${o.paymentMethod || 'Razorpay'} (${o.paymentId ? 'Paid' : 'Pending'})</span>
            </div>
            <div style="display:flex; justify-content:space-between;">
              <span style="color:var(--text-muted)">Courier</span>
              <span style="color:var(--text-primary)">${o.courierName || o.courierCompany || 'Shiprocket'}</span>
            </div>
          </div>

          <div style="display:flex; gap:8px;">
            <button class="btn btn-primary btn-sm" onclick="viewOrderDetails('${o.id}')" style="flex:1">View Invoice</button>
            ${o.awb ? `<button class="btn btn-outline btn-sm" onclick="trackOrder('${o.awb}')" style="flex:1">Track Order</button>` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  body.innerHTML = `
    <div style="margin-bottom: 24px; padding: 24px; background:linear-gradient(135deg, var(--bg-surface), #1a1a1a); border:1px solid var(--border); border-radius:var(--radius-lg);">
      <div style="font-size:0.75rem; color:var(--gold); text-transform:uppercase; letter-spacing:2px; font-weight:600; margin-bottom:8px;">Account Profile</div>
      <div style="font-weight:600; font-size:1.2rem; color:var(--text-primary); margin-bottom:4px;">${name}</div>
      <div style="font-size:0.85rem; color:var(--text-muted); margin-bottom:12px;">${phone}</div>
      <div style="display:flex; gap:8px;">
        <button class="btn btn-outline btn-sm" onclick="handleSignOut()" style="flex:1">Sign Out</button>
      </div>
    </div>

    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;">
      <h4 style="margin:0; font-family:var(--font-serif); font-size:1.1rem;">Your Orders</h4>
      <span style="font-size:0.8rem; color:var(--text-muted); background:var(--bg-elevated); padding:2px 8px; border-radius:12px;">${orders.length}</span>
    </div>
    
    <div class="orders-list">
      ${ordersHtml}
    </div>
  `;
};

window.closeUserDrawer = function() {
  document.getElementById('user-drawer-overlay')?.classList.remove('active');
  document.getElementById('user-drawer')?.classList.remove('open');
};

document.getElementById('user-drawer-overlay')?.addEventListener('click', closeUserDrawer);
document.getElementById('user-drawer-close')?.addEventListener('click', closeUserDrawer);

// ── EXTRACTED USER DASHBOARD FUNCTIONS ─────────────────────────
window.handleSignOut = async function() {
  await PhoneAuth.logout();
  closeUserDrawer();
  navigate('home');
  showToast('Signed out successfully');
  if (window.updateAuthUI) updateAuthUI();
};

window.trackOrder = async function(awb) {
  showToast('Fetching tracking details...', 'info');
  let data = {};
  if (window.ShiprocketHelper) {
    const res = await ShiprocketHelper.trackShipment(awb);
    data = res.tracking_data || {};
  }

  const activities = data?.shipment_track_activities || [];
  const listHtml = activities.map(a => `
    <div style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid var(--border)">
      <div style="font-size:0.75rem;color:var(--text-muted)">${a.date}</div>
      <div style="font-weight:500;margin:4px 0">${a.activity}</div>
      <div style="font-size:0.8rem;color:var(--text-secondary)">${a.location}</div>
    </div>
  `).join('');

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title">Tracking: ${awb}</h3>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
      </div>
      <div class="modal-body">
        ${listHtml || '<p>No tracking updates available yet.</p>'}
      </div>
    </div>
  `;
  document.body.appendChild(modal);
};

window.viewOrderDetails = function(orderId) {
  const o = window._currentUserOrders?.find(x => x.id === orderId);
  if (!o) return;

  const d = o.createdAt ? new Date(o.createdAt).toLocaleDateString() : 'Just now';
  const itemsHtml = (o.items || []).map(i => `
    <div style="display:flex; justify-content:space-between; margin-bottom:8px; border-bottom:1px solid var(--border); padding-bottom:8px;">
      <div>
        <div style="font-weight:500">${i.name}</div>
        <div style="font-size:0.8rem; color:var(--text-muted)">Qty: ${i.qty}</div>
      </div>
      <div style="font-weight:500">₹${i.price * i.qty}</div>
    </div>
  `).join('');

  const modal = document.createElement('div');
  modal.className = 'modal-overlay active';
  modal.innerHTML = `
    <div class="modal" id="print-area">
      <div class="modal-header">
        <h3 class="modal-title">Order #${o.id.slice(-6).toUpperCase()}</h3>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
      </div>
      <div class="modal-body" style="font-family:var(--font-sans); font-size:0.9rem;">
        
        <div style="margin-bottom:20px; display:flex; justify-content:space-between; flex-wrap:wrap; gap:20px;">
          <div>
            <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">Date</div>
            <div style="font-weight:500">${d}</div>
          </div>
          <div>
            <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">Status</div>
            <span class="pill pill-gold">${(o.status || 'PENDING').toUpperCase()}</span>
          </div>
        </div>

        <div style="margin-bottom:24px;">
          <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">Shipping Address</div>
          <div style="background:var(--bg-surface); padding:12px; border-radius:var(--radius-sm); border:1px solid var(--border);">
            ${o.address ? `
              <div style="font-weight:500">${o.address.name || o.customerName}</div>
              <div>${o.address.phone || o.customerPhone}</div>
              <div style="margin-top:4px; color:var(--text-secondary)">${o.address.address}, ${o.address.city}, ${o.address.state} - ${o.address.pincode}</div>
            ` : 'No address provided'}
          </div>
        </div>

        <div style="margin-bottom:24px;">
          <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">Items Ordered</div>
          <div style="background:var(--bg-surface); padding:12px; border-radius:var(--radius-sm); border:1px solid var(--border);">
            ${itemsHtml}
            <div style="display:flex; justify-content:space-between; margin-top:12px; font-size:0.85rem;">
              <span style="color:var(--text-muted)">Subtotal</span>
              <span>₹${o.subtotal || o.total}</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-top:4px; font-size:0.85rem;">
              <span style="color:var(--text-muted)">Shipping</span>
              <span>₹${o.shipping || 0}</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-top:8px; font-weight:600; font-size:1.1rem; border-top:1px solid var(--border); padding-top:8px;">
              <span>Total</span>
              <span style="color:var(--gold)">₹${o.total}</span>
            </div>
          </div>
        </div>

        <div style="margin-bottom:24px;">
          <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">Payment Details</div>
          <div style="background:var(--bg-surface); padding:12px; border-radius:var(--radius-sm); border:1px solid var(--border);">
            <div style="display:flex; justify-content:space-between;">
              <span style="color:var(--text-muted)">Method</span>
              <span style="font-weight:500">${o.paymentMethod || 'COD'}</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-top:4px;">
              <span style="color:var(--text-muted)">Status</span>
              <span style="font-weight:500; color:${o.paymentMethod === 'Online' ? 'var(--success)' : 'var(--warning)'}">${o.paymentMethod === 'Online' ? 'Paid' : 'Pending (COD)'}</span>
            </div>
            ${o.paymentId ? `
              <div style="display:flex; justify-content:space-between; margin-top:4px; font-size:0.8rem;">
                <span style="color:var(--text-muted)">Transaction ID</span>
                <span>${o.paymentId}</span>
              </div>
            ` : ''}
          </div>
        </div>

      </div>
      <div style="padding:16px 24px; border-top:1px solid var(--border); display:flex; justify-content:flex-end;">
        <button class="btn btn-outline" onclick="printInvoice()">Print Invoice</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
};

window.printInvoice = function() {
  const printContent = document.getElementById('print-area').innerHTML;
  const originalContent = document.body.innerHTML;
  document.body.innerHTML = '<div class="invoice-print-wrapper" style="padding:40px; color:black; background:white;">' + printContent.replace(/<button.*?>.*?<\/button>/g, '') + '</div>';
  window.print();
  document.body.innerHTML = originalContent;
  window.location.reload();
};

// ── Universal Phone Auth Modal ───────────────────────────────
window.showPhoneAuthModal = function() {
  const existing = document.getElementById('phone-auth-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'phone-auth-overlay';
  overlay.className = 'modal-overlay active';
  overlay.innerHTML = `
    <div class="modal" style="max-width:420px">
      <div class="modal-header">
        <h3 class="modal-title" id="phone-auth-title">Login / Register</h3>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
      </div>
      <div class="modal-body">
        <p style="color:var(--text-muted);margin-bottom:20px;font-size:0.9rem;">
          Please login or create a new account to view your orders and checkout faster.
        </p>

        <!-- Login/Register Tabs -->
        <div style="display:flex;gap:8px;margin-bottom:20px">
          <button class="btn btn-outline btn-sm" id="pa-login-tab" onclick="switchPaAuthTab('login')" style="flex:1;border-color:var(--gold);color:var(--gold)">Login</button>
          <button class="btn btn-outline btn-sm" id="pa-register-tab" onclick="switchPaAuthTab('register')" style="flex:1">Register</button>
        </div>

        <!-- Login Form -->
        <div id="pa-login-form">
          <div class="form-group" style="margin-bottom:16px">
            <label class="form-label">Phone Number</label>
            <input type="tel" class="form-input" id="pa-login-phone" placeholder="10-digit number" pattern="[0-9]{10}" required style="width:100%">
          </div>
          <div class="form-group" style="margin-bottom:20px">
            <label class="form-label">Password</label>
            <input type="password" class="form-input" id="pa-login-pass" placeholder="Enter password" required style="width:100%">
          </div>
          <button class="btn btn-primary btn-full" onclick="handlePaLogin()" id="pa-login-btn">Login</button>
          <div id="pa-login-error" style="color:var(--error);font-size:0.85rem;margin-top:12px;display:none"></div>
        </div>

        <!-- Register Form -->
        <div id="pa-register-form" style="display:none">
          <div class="form-group" style="margin-bottom:16px">
            <label class="form-label">Full Name</label>
            <input type="text" class="form-input" id="pa-reg-name" placeholder="Your name" required style="width:100%">
          </div>
          <div class="form-group" style="margin-bottom:16px">
            <label class="form-label">Phone Number</label>
            <input type="tel" class="form-input" id="pa-reg-phone" placeholder="10-digit number" pattern="[0-9]{10}" required style="width:100%">
          </div>
          <div class="form-group" style="margin-bottom:20px">
            <label class="form-label">Create Password</label>
            <input type="password" class="form-input" id="pa-reg-pass" placeholder="Min 6 characters" minlength="6" required style="width:100%">
          </div>
          <button class="btn btn-primary btn-full" onclick="handlePaRegister()" id="pa-reg-btn">Create Account</button>
          <div id="pa-reg-error" style="color:var(--error);font-size:0.85rem;margin-top:12px;display:none"></div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
};

window.switchPaAuthTab = function(tab) {
  const loginTab = document.getElementById('pa-login-tab');
  const regTab = document.getElementById('pa-register-tab');
  const loginForm = document.getElementById('pa-login-form');
  const regForm = document.getElementById('pa-register-form');

  if (tab === 'login') {
    loginTab.style.borderColor = 'var(--gold)';
    loginTab.style.color = 'var(--gold)';
    regTab.style.borderColor = 'var(--border)';
    regTab.style.color = 'var(--text-primary)';
    loginForm.style.display = 'block';
    regForm.style.display = 'none';
  } else {
    regTab.style.borderColor = 'var(--gold)';
    regTab.style.color = 'var(--gold)';
    loginTab.style.borderColor = 'var(--border)';
    loginTab.style.color = 'var(--text-primary)';
    loginForm.style.display = 'none';
    regForm.style.display = 'block';
  }
  document.getElementById('pa-login-error').style.display = 'none';
  document.getElementById('pa-reg-error').style.display = 'none';
};

window.handlePaLogin = async function() {
  const phone = document.getElementById('pa-login-phone').value.trim();
  const password = document.getElementById('pa-login-pass').value;
  const btn = document.getElementById('pa-login-btn');
  const errEl = document.getElementById('pa-login-error');

  if (!phone || phone.length !== 10) {
    errEl.textContent = 'Enter a valid 10-digit phone number';
    errEl.style.display = 'block';
    return;
  }
  if (!password || password.length < 6) {
    errEl.textContent = 'Password must be at least 6 characters';
    errEl.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Logging in...';
  errEl.style.display = 'none';

  try {
    await PhoneAuth.login(phone, password);
    document.getElementById('phone-auth-overlay')?.remove();
    showToast('Logged in successfully!', 'success');
    
    const checkoutForm = document.getElementById('checkout-form');
    if (checkoutForm) {
      checkoutForm.requestSubmit();
    } else {
      openUserDrawer();
    }
  } catch (e) {
    errEl.textContent = e.message || 'Login failed. Check your credentials.';
    errEl.style.display = 'block';
    btn.disabled = false;
    btn.textContent = 'Login';
  }
};

window.handlePaRegister = async function() {
  const name = document.getElementById('pa-reg-name').value.trim();
  const phone = document.getElementById('pa-reg-phone').value.trim();
  const password = document.getElementById('pa-reg-pass').value;
  const btn = document.getElementById('pa-reg-btn');
  const errEl = document.getElementById('pa-reg-error');

  if (!name) {
    errEl.textContent = 'Please enter your name';
    errEl.style.display = 'block';
    return;
  }
  if (!phone || phone.length !== 10) {
    errEl.textContent = 'Enter a valid 10-digit phone number';
    errEl.style.display = 'block';
    return;
  }
  if (!password || password.length < 6) {
    errEl.textContent = 'Password must be at least 6 characters';
    errEl.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Creating account...';
  errEl.style.display = 'none';

  try {
    await PhoneAuth.register(phone, name, password);
    document.getElementById('phone-auth-overlay')?.remove();
    showToast('Account created! Welcome ' + name, 'success');
    
    const checkoutForm = document.getElementById('checkout-form');
    if (checkoutForm) {
      checkoutForm.requestSubmit();
    } else {
      openUserDrawer();
    }
  } catch (e) {
    errEl.textContent = e.message || 'Registration failed. Please try again.';
    errEl.style.display = 'block';
    btn.disabled = false;
    btn.textContent = 'Create Account';
  }
};

}

document.addEventListener('DOMContentLoaded', runInitializationSequence);

// ── Background Devotional Violin BGM ─────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const bgm = new Audio('assets/bgm.mp3');
  bgm.loop = true;
  bgm.volume = 0.5; // Premium balanced volume

  const musicBtn = document.getElementById('music-btn');
  const musicIcon = document.getElementById('music-icon');
  
  if (!musicBtn) return;

  const soundOnPath = musicIcon.querySelector('.sound-on');
  const soundOffPath = musicIcon.querySelector('.sound-off');

  let isMuted = localStorage.getItem('pa_bgm_muted') === 'true';

  function updateMusicUI() {
    if (isMuted) {
      musicBtn.classList.remove('playing');
      musicBtn.classList.add('muted');
      if (soundOnPath) soundOnPath.style.display = 'none';
      if (soundOffPath) soundOffPath.style.display = 'block';
    } else {
      musicBtn.classList.add('playing');
      musicBtn.classList.remove('muted');
      if (soundOnPath) soundOnPath.style.display = 'block';
      if (soundOffPath) soundOffPath.style.display = 'none';
    }
  }

  // Handle Autoplay & Interaction
  async function attemptPlay() {
    if (isMuted) return;
    try {
      await bgm.play();
      console.log('[BGM] Autoplay successful');
      updateMusicUI();
    } catch(err) {
      console.log('[BGM] Autoplay blocked, waiting for interaction');
      // Wait for first user interaction
      const startBGMOnInteraction = async () => {
        try {
          if (!isMuted && bgm.paused) {
            await bgm.play();
            updateMusicUI();
            console.log('[BGM] Started on user interaction');
          }
        } catch(e) {
          console.warn('[BGM] Failed to start on interaction', e);
        }
        // Remove listeners after first trigger
        ['click', 'keydown', 'touchstart', 'scroll'].forEach(evt => {
          document.removeEventListener(evt, startBGMOnInteraction);
        });
      };
      
      ['click', 'keydown', 'touchstart', 'scroll'].forEach(evt => {
        document.addEventListener(evt, startBGMOnInteraction, { passive: true });
      });
    }
  }

  // Toggle state
  musicBtn.addEventListener('click', async () => {
    if (bgm.paused) {
      isMuted = false;
      localStorage.setItem('pa_bgm_muted', 'false');
      try {
        await bgm.play();
        showToast('Devotional BGM playing 🎵', 'info');
      } catch(e) {
        console.error(e);
      }
    } else {
      isMuted = true;
      localStorage.setItem('pa_bgm_muted', 'true');
      bgm.pause();
      showToast('BGM muted 🔇', 'info');
    }
    updateMusicUI();
  });

  // Initial UI state
  updateMusicUI();

  // Run autoplay try
  setTimeout(attemptPlay, 1000);
});
