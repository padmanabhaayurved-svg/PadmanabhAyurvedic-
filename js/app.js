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

  // 4. Handle Auth0 Callback if present
  if (window.location.search.includes('code=') && window.location.search.includes('state=')) {
    if (window.Auth0Helper) {
      await Auth0Helper.handleCallback();
      updateAuthUI();
    }
  }

  // 5. Initial Auth UI update
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
const _pageCache  = {};

const ROUTES = {
  '':          'pages/home.html',
  'home':      'pages/home.html',
  'about':     'pages/about.html',
  'catalog':   'pages/catalog.html',
  'product':   'pages/product.html',
  'earn':      'pages/earn.html',
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

    // Toggle floating cart
    const floatCart = document.getElementById('floating-cart-btn');
    if (floatCart) {
      floatCart.style.display = route === 'cart' ? 'none' : 'flex';
    }

    // Run page init
    const inits = {
      '':          initHome,
      'home':      initHome,
      'about':     initAbout,
      'catalog':   initCatalog,
      'product':   () => initProduct(param),
      'earn':      () => {},
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
  document.querySelectorAll('.nav-link, .mobile-nav-link').forEach(el => {
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

  // Chatbot logic
  const chatBtn = document.getElementById('chatbot-btn');
  const chatWindow = document.getElementById('chatbot-window');
  const chatClose = document.getElementById('chatbot-close');
  const chatSend = document.getElementById('chat-send');
  const chatInput = document.getElementById('chat-input');
  const chatBody = document.getElementById('chat-body');

  let chatState = 'INIT';
  let chatData = { name: '', phone: '', product: '', address: '', payment: '' };

  function toggleChat() {
    chatWindow.classList.toggle('open');
    if (chatWindow.classList.contains('open')) {
      chatInput.focus();
      // On first open, try to get lead data
      if (chatState === 'INIT') {
        try {
          const leads = JSON.parse(localStorage.getItem('pa_leads') || '[]');
          if (leads.length > 0) {
            const lead = leads[0];
            chatData.name = lead.name;
            chatData.phone = lead.phone;
          }
        } catch(e) {}
        
        chatBody.innerHTML = '';
        if (chatData.name) {
          chatState = 'ASK_PRODUCT';
          appendBotMessage(`Namaste ${chatData.name}! What product or service are you looking for today?`, [
            'Ortho Secure Capsule', 'Arshas Cure Capsule', 'Taka Tak Powder', 'Consultation'
          ]);
        } else {
          chatState = 'ASK_NAME';
          appendBotMessage(`Namaste! Welcome to Padmanabh Ayurvedics. May I know your name?`);
        }
      }
    }
  }

  if (chatBtn) chatBtn.addEventListener('click', toggleChat);
  if (chatClose) chatClose.addEventListener('click', toggleChat);

  window.handleChatOption = function(option) {
    if (chatInput) {
      chatInput.value = option;
      sendChatMessage();
    }
  };

  function appendBotMessage(text, options = []) {
    const botMsg = document.createElement('div');
    botMsg.className = 'chat-msg bot';
    let html = text;
    if (options.length > 0) {
      html += `<div class="chat-options" style="margin-top:10px; display:flex; flex-direction:column; gap:6px;">`;
      options.forEach(opt => {
        html += `<button class="btn btn-outline btn-sm" onclick="handleChatOption('${opt}')" style="text-align:left; font-size:0.8rem; padding:6px 10px;">${opt}</button>`;
      });
      html += `</div>`;
    }
    botMsg.innerHTML = html;
    chatBody.appendChild(botMsg);
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  function sendChatMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    // Add user message
    const userMsg = document.createElement('div');
    userMsg.className = 'chat-msg user';
    userMsg.textContent = text;
    chatBody.appendChild(userMsg);
    chatInput.value = '';
    chatBody.scrollTop = chatBody.scrollHeight;

    // Process State
    setTimeout(async () => {
      switch(chatState) {
        case 'ASK_NAME':
          chatData.name = text;
          chatState = 'ASK_PHONE';
          appendBotMessage(`Thank you, ${chatData.name}. Could you please share your WhatsApp number?`);
          break;
        case 'ASK_PHONE':
          chatData.phone = text;
          chatState = 'ASK_PRODUCT';
          appendBotMessage(`Got it! What product or service are you looking for today?`, [
            'Ortho Secure Capsule', 'Arshas Cure Capsule', 'Taka Tak Powder',
            'Ortho Relief Oil', 'Ashwagandha Vitality Capsules',
            'Joint Care Combo Pack', 'Consultation / Ayurvedic Therapy'
          ]);
          break;
        case 'ASK_PRODUCT':
          chatData.product = text;
          if (text === 'Consultation') {
            chatState = 'CLOSE_DEAL';
            appendBotMessage(`We'll schedule your consultation shortly. Our expert will contact you on ${chatData.phone}. Is there anything else?`, ['No, thanks', 'Shop Products']);
          } else {
            chatState = 'ASK_ADDRESS';
            // Try adding to cart
            if (window.Store && Store.getCachedProducts) {
              const prods = Store.getCachedProducts();
              const p = prods.find(x => x.name.toLowerCase().includes(text.toLowerCase()) || text.toLowerCase().includes(x.name.toLowerCase()));
              if (p) {
                Store.addToCart(p);
                appendBotMessage(`I've noted your interest in ${text} and added it to your cart! Could you please provide your full delivery address?`);
              } else {
                appendBotMessage(`I've noted your interest in ${text}. Could you please provide your full delivery address?`);
              }
            } else {
              appendBotMessage(`I've noted your interest in ${text}. Could you please provide your full delivery address?`);
            }
          }
          break;
        case 'ASK_ADDRESS':
          chatData.address = text;
          chatState = 'ASK_PAYMENT';
          appendBotMessage(`Thank you. How would you like to pay?`, ['Cash on Delivery (COD)', 'Online Payment (Razorpay)']);
          break;
        case 'ASK_PAYMENT':
          chatData.payment = text;
          chatState = 'CLOSE_DEAL';
          try {
            const cartItems = Store.getCart();
            const cartTotal = Store.getCartTotal();
            const shipping = cartTotal >= 499 ? 0 : 60;
            
            const orderData = {
              customerName: chatData.name,
              customerPhone: chatData.phone,
              address: { address: chatData.address, city: '', pincode: '', state: '', name: chatData.name, phone: chatData.phone },
              paymentMethod: text,
              items: cartItems.length > 0 ? cartItems : [{ name: chatData.product, qty: 1, price: 0, productId: 'CHAT' }],
              subtotal: cartTotal,
              shipping,
              total: cartTotal + shipping,
              userId: chatData.phone // Using phone as temporary ID if not logged in
            };

            console.log('[Chatbot] Creating order in Firebase:', orderData);
            
            let orderId = 'ORD' + Date.now().toString().slice(-6);
            if (window.createOrder) {
              orderId = await createOrder(orderData);
            }

            appendBotMessage(`✅ Order #${orderId.slice(-6).toUpperCase()} confirmed! Payment: ${text}. Delivering to: ${chatData.address}. We'll send updates to ${chatData.phone}. Thank you for choosing Padmanabh Ayurvedics! 🌿`);
          } catch(e) {
            console.error('[Chatbot] Order failed:', e);
            appendBotMessage(`Something went wrong with the order, but we've noted your interest in ${chatData.product}. Our team will contact you on ${chatData.phone}.`);
          }
          break;
        case 'CLOSE_DEAL':
          if (text === 'Shop Products') {
             chatState = 'ASK_PRODUCT';
             if (window.navigate) navigate('catalog');
             toggleChat();
          } else {
             appendBotMessage(`Thank you! Have a great day ahead.`);
          }
          break;
        default:
          appendBotMessage(`I am here to help you with your Ayurvedic journey.`);
      }
    }, 800);
  }

// Update Navbar UI based on Auth state
window.updateAuthUI = async function() {
  let user = window.getCurrentUser ? getCurrentUser() : null;
  if (!user && window.Auth0Helper) {
    const auth0User = await Auth0Helper.getUser();
    if (auth0User) {
      user = { uid: auth0User.sub, email: auth0User.email, displayName: auth0User.name };
    }
  }

  const navDashBtn = document.querySelector('[data-i18n="nav.dashboard"]');
  const mobileDashBtn = document.querySelector('#mobile-nav [data-i18n="nav.dashboard"]');

  if (user) {
    const name = user.displayName || user.email.split('@')[0];
    const label = `Hi, ${name}`;
    if (navDashBtn) {
      navDashBtn.innerHTML = `<span style="display:flex;align-items:center;gap:6px">👤 ${label}</span>`;
      navDashBtn.classList.add('logged-in');
    }
    if (mobileDashBtn) {
      mobileDashBtn.innerHTML = `👤 ${label}`;
      mobileDashBtn.classList.add('logged-in');
    }
  } else {
    if (navDashBtn) {
      navDashBtn.textContent = 'My Orders';
      navDashBtn.classList.remove('logged-in');
    }
    if (mobileDashBtn) {
      mobileDashBtn.textContent = 'My Orders';
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

// ── USER PROFILE DRAWER ───────────────────────────────────────
window.openUserDrawer = async function() {
  const overlay = document.getElementById('user-drawer-overlay');
  const drawer = document.getElementById('user-drawer');
  const body = document.getElementById('user-drawer-body');
  
  // Show spinner immediately
  overlay.classList.add('active');
  drawer.classList.add('open');
  body.innerHTML = `<div class="text-center" style="padding:40px;"><div class="spinner" style="border-top-color:var(--gold);width:30px;height:30px;border-width:3px;margin:0 auto;"></div><p style="margin-top:16px;color:var(--text-muted)">Loading Profile...</p></div>`;

  // Get User
  let user = window.getCurrentUser ? getCurrentUser() : null;
  if (!user && window.Auth0Helper) {
    const auth0User = await Auth0Helper.getUser();
    if (auth0User) {
      user = { uid: auth0User.sub, email: auth0User.email, displayName: auth0User.name, isAuth0: true };
    }
  }

  if (!user) {
    // Show Login Prompt instead of auto-redirecting
    body.innerHTML = `
      <div style="text-align:center; padding: 60px 20px;">
        <div style="font-size:3.5rem; margin-bottom:24px;">🔐</div>
        <h3 style="font-family:var(--font-serif); margin-bottom:12px;">Login Required</h3>
        <p style="color:var(--text-muted); margin-bottom:32px; line-height:1.6;">Sign in to view your orders, track shipments, and manage your profile.</p>
        
        <button class="btn btn-primary btn-full" onclick="Auth0Helper.login('#dashboard')" style="margin-bottom:12px;">
          <span style="display:flex;align-items:center;justify-content:center;gap:8px">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
            Sign In with Secure Auth
          </span>
        </button>
        <p style="font-size:0.75rem; color:var(--text-muted); margin-top:24px;">
          Note: If you see an Auth0 'Dev Keys' warning, please configure your own Social Connection credentials in the Auth0 Dashboard for production use.
        </p>
      </div>
    `;
    return;
  }

  // Fetch orders
  let orders = [];
  try { orders = JSON.parse(localStorage.getItem('pa_orders') || '[]'); } catch(e) {}
  if (window.getUserOrders) {
    try {
      const fbOrders = await getUserOrders(user.uid);
      if (fbOrders && fbOrders.length > 0) {
        const fbIds = fbOrders.map(o => o.id);
        orders = orders.filter(o => !fbIds.includes(o.id));
        orders = [...fbOrders, ...orders];
      }
    } catch(e) {}
  }
  
  window._currentUserOrders = orders; // For modal usage

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
      <div style="font-weight:600; font-size:1.2rem; color:var(--text-primary); margin-bottom:4px;">${user.displayName || user.email.split('@')[0]}</div>
      <div style="font-size:0.85rem; color:var(--text-muted); margin-bottom:12px;">${user.email}</div>
      <div style="font-size:0.7rem; color:var(--text-muted); font-family:monospace; margin-bottom:20px; background:rgba(255,255,255,0.05); padding:4px 8px; border-radius:4px; display:inline-block;">ID: ${user.uid}</div>
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
  const user = await Auth0Helper.getUser();
  if (user) {
    await Auth0Helper.logout('#');
  } else {
    if (window.signOut) await window.signOut();
    navigate('home');
    showToast('Signed out successfully');
  }
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
  document.body.innerHTML = '<div style="padding:40px; color:black; background:white;">' + printContent.replace(/<button.*?>.*?<\/button>/g, '') + '</div>';
  window.print();
  document.body.innerHTML = originalContent;
  window.location.reload();
};




}

document.addEventListener('DOMContentLoaded', runInitializationSequence);
